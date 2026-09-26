import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { api } from '../../services/api';
import { AlertTriangle, CheckCircle, ShieldAlert } from 'lucide-react';

/**
 * AllocateModal Component
 * 
 * Handles issuance of an available laptop to a verified Student or Faculty member.
 * Features:
 * - Real-time zero-conflict check (One Active Laptop Rule)
 * - License Fee Clearance warning modal for students with unpaid software dues
 * - Handover condition specification and scheduled due date configuration
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Modal visibility flag
 * @param {Function} props.onClose - Modal close handler
 * @param {Object} [props.selectedAsset] - Pre-selected asset instance (optional)
 * @param {Function} props.onSuccess - Callback triggered upon successful allocation
 */
export const AllocateModal = ({ isOpen, onClose, selectedAsset = null, onSuccess }) => {
  const [assets, setAssets] = useState([]);
  const [recipients, setRecipients] = useState([]);
  const [assetId, setAssetId] = useState(selectedAsset?.id || '');
  const [recipientId, setRecipientId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [issueCondition, setIssueCondition] = useState('GOOD');
  const [notes, setNotes] = useState('');
  const [overrideWarning, setOverrideWarning] = useState(false);

  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);
  const [error, setError] = useState(null);
  const [feeWarning, setFeeWarning] = useState(null);
  const [recipientInfo, setRecipientInfo] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setAssetId(selectedAsset?.id || '');
      setRecipientId('');
      setRecipientInfo(null);
      setNotes('');
      setError(null);
      setFeeWarning(null);
      setOverrideWarning(false);

      // Default due date: 180 days from now
      const defaultDue = new Date(Date.now() + 180 * 86400000).toISOString().split('T')[0];
      setDueDate(defaultDue);

      loadData();
    }
  }, [isOpen, selectedAsset]);

  const loadData = async () => {
    setFetchingData(true);
    try {
      const [assetsRes, recipientsRes] = await Promise.all([
        api.get('/assets?status=AVAILABLE&limit=100'),
        api.get('/recipients'),
      ]);

      let availableAssets = assetsRes.data?.data?.assets || [];
      // If currently selected asset is passed, ensure it is in the list
      if (selectedAsset && !availableAssets.some((a) => a.id === selectedAsset.id)) {
        availableAssets = [selectedAsset, ...availableAssets];
      }

      setAssets(availableAssets);
      setRecipients(recipientsRes.data?.data?.recipients || []);
    } catch (err) {
      console.error('Failed to load allocation candidates:', err);
    } finally {
      setFetchingData(false);
    }
  };

  const handleRecipientChange = (e) => {
    const rId = e.target.value;
    setRecipientId(rId);
    setError(null);
    setFeeWarning(null);

    if (!rId) {
      setRecipientInfo(null);
      return;
    }

    const selectedRecipient = recipients.find((r) => r.id === Number(rId));
    setRecipientInfo(selectedRecipient || null);

    if (selectedRecipient) {
      // Check active allocation conflict
      if (selectedRecipient.receivedAllocations?.length > 0) {
        setError(
          `Conflict: ${selectedRecipient.name} already holds an active laptop (${selectedRecipient.receivedAllocations[0].asset.assetTag}). SSISM policy enforces One Active Laptop Per Student/Faculty.`
        );
      }

      // Check Software License Fee (Only students pay fees; teachers/staff are exempt)
      if (selectedRecipient.role === 'STUDENT') {
        const fee = selectedRecipient.licenseFeeRecords?.[0];
        if (fee && fee.status === 'UNPAID') {
          setFeeWarning({
            amount: fee.amount,
            academicYear: fee.academicYear,
            message: `Student software license fee of ₹${fee.amount} (${fee.academicYear}) is UNPAID.`,
          });
        }
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!assetId || !recipientId) {
      setError('Please select both an available laptop and a recipient.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        assetId: Number(assetId),
        recipientId: Number(recipientId),
        dueDate: dueDate || null,
        issueCondition,
        notes: notes || null,
        overrideUnpaidFeeWarning: overrideWarning,
      };

      const res = await api.post('/allocations', payload);
      onSuccess(res.data.data.allocation);
      onClose();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to complete laptop allocation.';
      setError(msg);
      if (err.response?.status === 402) {
        setFeeWarning({
          message: msg,
          requiresOverride: true,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Allocate Laptop to Student / Faculty" maxWidth="max-w-xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start space-x-2">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* 1. Select Available Laptop */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
            Select Laptop (Only AVAILABLE Stock) *
          </label>
          {fetchingData ? (
            <div className="text-xs text-slate-400">Loading available inventory...</div>
          ) : (
            <select
              value={assetId}
              onChange={(e) => setAssetId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 text-sm outline-none text-slate-800 bg-white"
              required
            >
              <option value="">-- Choose an Available Laptop --</option>
              {assets.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.assetTag} • {asset.make} {asset.model} ({asset.processor}, {asset.ram}, {asset.storage})
                </option>
              ))}
            </select>
          )}
        </div>

        {/* 2. Select Recipient */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
            Select Recipient (Student / Faculty) *
          </label>
          <select
            value={recipientId}
            onChange={handleRecipientChange}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 text-sm outline-none text-slate-800 bg-white"
            required
          >
            <option value="">-- Choose Recipient --</option>
            {recipients.map((rec) => {
              const hasActive = rec.receivedAllocations?.length > 0;
              const feeStatus = rec.licenseFeeRecords?.[0]?.status || 'N/A';
              return (
                <option key={rec.id} value={rec.id} disabled={hasActive}>
                  {rec.name} ({rec.rollNumberOrEmpId}) • {rec.role} • {rec.department?.code}
                  {hasActive ? ' [ALREADY ISSUED]' : ''}
                  {rec.role === 'STUDENT' ? ` • Fee: ${feeStatus}` : ''}
                </option>
              );
            })}
          </select>

          {/* FACULTY / STAFF FEE EXEMPTION NOTICE */}
          {recipientInfo && recipientInfo.role !== 'STUDENT' && (
            <div className="mt-2.5 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                <strong>Faculty / Institutional Allocation:</strong> Software & maintenance fees are 100% exempt (No payment required).
              </span>
            </div>
          )}
        </div>

        {/* LICENSE FEE ALERT POPUP / CARD */}
        {feeWarning && (
          <div className="p-4 rounded-xl bg-amber-50 border-2 border-amber-300 shadow-sm animate-scale-up">
            <div className="flex items-start space-x-3">
              <ShieldAlert className="w-6 h-6 text-amber-600 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-bold text-amber-900">
                  Software License Fee Clearance Alert
                </h4>
                <p className="text-xs text-amber-800 mt-1">{feeWarning.message}</p>
                <div className="mt-3 flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="feeOverride"
                    checked={overrideWarning}
                    onChange={(e) => setOverrideWarning(e.target.checked)}
                    className="w-4 h-4 text-brand-600 rounded border-amber-400 focus:ring-brand-500"
                  />
                  <label htmlFor="feeOverride" className="text-xs font-semibold text-amber-900 cursor-pointer">
                    Authorize issuance override (Special Dean / HOD Approval)
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 3. Due Date & Condition */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Scheduled Return Due Date
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 text-sm outline-none text-slate-800"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Handover Physical Condition
            </label>
            <select
              value={issueCondition}
              onChange={(e) => setIssueCondition(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 text-sm outline-none text-slate-800 bg-white"
            >
              <option value="BRAND_NEW">Brand New</option>
              <option value="GOOD">Good / Tested</option>
              <option value="SCRATCHES">Minor Scratches</option>
            </select>
          </div>
        </div>

        {/* 4. Notes */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
            Allocation Remarks / Accessories Handed Over
          </label>
          <textarea
            rows="2"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Handed over with original Dell 65W charger and official backpack..."
            className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 text-sm outline-none text-slate-800"
          />
        </div>

        {/* Zero-Conflict Concurrency Lock Notice */}
        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 text-[11px] text-slate-500 flex items-center space-x-2">
          <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
          <span>Protected by MySQL transaction locks to prevent concurrent double-booking.</span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || (feeWarning && !overrideWarning)}
            className="px-5 py-2 text-xs font-bold text-white bg-[#F26522] hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-md shadow-orange-500/20 transition flex items-center space-x-2"
          >
            {loading ? 'Allocating...' : '+ Issue Asset'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
