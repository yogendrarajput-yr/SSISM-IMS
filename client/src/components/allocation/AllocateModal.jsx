import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../common/Modal';
import { CustomSelect } from '../common/CustomSelect';
import { QuickCreateUserModal } from './QuickCreateUserModal';
import { api } from '../../services/api';
import {
  AlertTriangle,
  CheckCircle,
  ShieldAlert,
  UserPlus,
  Search,
  Laptop,
  User,
  Filter,
} from 'lucide-react';

/**
 * AllocateModal Component
 * 
 * Handles issuance of an available laptop to a verified Student or Employee (Staff/Faculty).
 * Features:
 * - Smart Dynamic Filters: ONLY displays available laptops & unallocated recipients
 * - Inline Quick-Create: "+ Add New Student/Employee" modal with auto-selection without page reload
 * - Real-time zero-conflict check (One Active Laptop Rule)
 * - License Fee Clearance warning modal for students with unpaid software dues
 * - Handover condition specification and scheduled due date configuration
 */
export const AllocateModal = ({ isOpen, onClose, selectedAsset = null, onSuccess }) => {
  const [assets, setAssets] = useState([]);
  const [recipients, setRecipients] = useState([]);
  const [assetId, setAssetId] = useState(selectedAsset?.id || '');
  const [recipientId, setRecipientId] = useState('');
  const [hasExpectedReturnDate, setHasExpectedReturnDate] = useState(false);
  const [expectedReturnDate, setExpectedReturnDate] = useState('');
  const [issueCondition, setIssueCondition] = useState('GOOD');
  const [notes, setNotes] = useState('');
  const [overrideWarning, setOverrideWarning] = useState(false);

  // Handover Accessory Checklist state
  const [accessories, setAccessories] = useState({
    charger: true,
    bag: true,
    mouse: false,
    other: false,
    otherText: '',
  });

  // Search & filter states inside modal
  const [recipientSearch, setRecipientSearch] = useState('');
  const [assetSearch, setAssetSearch] = useState('');
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);

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
      setRecipientSearch('');
      setAssetSearch('');

      // Default accessories checklist
      setAccessories({
        charger: true,
        bag: true,
        mouse: false,
        other: false,
        otherText: '',
      });

      // Keep Expected Return Date DISABLED by default
      setHasExpectedReturnDate(false);
      const defaultDue = new Date(Date.now() + 180 * 86400000).toISOString().split('T')[0];
      setExpectedReturnDate(defaultDue);

      loadData();
    }
  }, [isOpen, selectedAsset]);

  const loadData = async () => {
    setFetchingData(true);
    try {
      const [assetsRes, recipientsRes] = await Promise.all([
        api.get('/assets?status=AVAILABLE&category=LAPTOP&limit=500'),
        api.get('/recipients?excludeActive=true'),
      ]);

      let availableAssets = (assetsRes.data?.data?.assets || []).filter(
        (a) => a.status === 'AVAILABLE'
      );

      // If pre-selected asset is passed, verify it is available
      if (selectedAsset) {
        if (selectedAsset.status === 'AVAILABLE') {
          if (!availableAssets.some((a) => a.id === selectedAsset.id)) {
            availableAssets = [selectedAsset, ...availableAssets];
          }
        } else {
          setError(
            `Asset Warning: Laptop ${selectedAsset.assetTag} is currently in '${selectedAsset.status}' status and cannot be issued.`
          );
        }
      }

      setAssets(availableAssets);

      // Strict Dynamic Filter: Display ONLY students & employees with NO active issued device
      const eligibleRecipients = (recipientsRes.data?.data?.recipients || []).filter(
        (r) => !r.receivedAllocations || r.receivedAllocations.length === 0
      );
      setRecipients(eligibleRecipients);
    } catch (err) {
      console.error('Failed to load allocation candidates:', err);
    } finally {
      setFetchingData(false);
    }
  };

  // Filtered Assets based on user search
  const filteredAssets = useMemo(() => {
    if (!assetSearch.trim()) return assets;
    const term = assetSearch.toLowerCase();
    return assets.filter(
      (a) =>
        a.assetTag?.toLowerCase().includes(term) ||
        a.serialNumber?.toLowerCase().includes(term) ||
        a.model?.toLowerCase().includes(term) ||
        a.make?.toLowerCase().includes(term) ||
        a.processor?.toLowerCase().includes(term)
    );
  }, [assets, assetSearch]);

  // Filtered Recipients based on user search
  const filteredRecipients = useMemo(() => {
    if (!recipientSearch.trim()) return recipients;
    const term = recipientSearch.toLowerCase();
    return recipients.filter(
      (r) =>
        r.name?.toLowerCase().includes(term) ||
        r.rollNumberOrEmpId?.toLowerCase().includes(term) ||
        r.email?.toLowerCase().includes(term) ||
        r.department?.code?.toLowerCase().includes(term) ||
        r.role?.toLowerCase().includes(term)
    );
  }, [recipients, recipientSearch]);

  const handleRecipientChange = (rId) => {
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
      // Conflict safeguard
      if (selectedRecipient.receivedAllocations?.length > 0) {
        setError(
          `Conflict: ${selectedRecipient.name} already holds an active laptop (${selectedRecipient.receivedAllocations[0].asset?.assetTag || 'Assigned'}). SSISM policy enforces One Active Laptop Per Student/Faculty.`
        );
      }

      // Software License Fee Check for Students
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

  /**
   * Handle user created via inline QuickCreateUserModal
   * Automatically adds user to recipient list and selects them without page refresh
   */
  const handleUserCreated = (newUser) => {
    setRecipients((prev) => [newUser, ...prev.filter((r) => r.id !== newUser.id)]);
    setRecipientId(String(newUser.id));
    setRecipientInfo(newUser);
    setError(null);
    setRecipientSearch('');

    if (newUser.role === 'STUDENT' && newUser.licenseFeeRecords?.[0]?.status === 'UNPAID') {
      setFeeWarning({
        amount: newUser.licenseFeeRecords[0].amount,
        academicYear: newUser.licenseFeeRecords[0].academicYear,
        message: `Student software license fee is UNPAID. Special authorization required for issuance.`,
      });
    } else {
      setFeeWarning(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!assetId || !recipientId) {
      setError('Please select both an available laptop and an eligible recipient.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const finalReturnDate = (hasExpectedReturnDate && expectedReturnDate) ? expectedReturnDate : null;

      // Construct accessories checklist array
      const selectedAccessories = [];
      if (accessories.charger) selectedAccessories.push('Charger / Adapter');
      if (accessories.bag) selectedAccessories.push('Laptop Bag');
      if (accessories.mouse) selectedAccessories.push('External Mouse');
      if (accessories.other && accessories.otherText.trim()) {
        selectedAccessories.push(accessories.otherText.trim());
      }

      const payload = {
        assetId: Number(assetId),
        recipientId: Number(recipientId),
        expectedReturnDate: finalReturnDate,
        dueDate: finalReturnDate,
        accessories: selectedAccessories,
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
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Allocate Laptop to Student / Faculty" maxWidth="max-w-xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. Select Available Laptop */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                1. Select Laptop (Only AVAILABLE Stock) *
              </label>
              <span className="text-[11px] font-semibold text-slate-500">
                {filteredAssets.length} Available
              </span>
            </div>

            {/* Quick search filter for laptops if list is long */}
            {assets.length > 5 && (
              <div className="relative mb-1">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={assetSearch}
                  onChange={(e) => setAssetSearch(e.target.value)}
                  placeholder="Filter available laptops by tag, make, model..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-brand-500 outline-none"
                />
              </div>
            )}

            {fetchingData ? (
              <div className="text-xs text-slate-400 py-2">Loading available inventory...</div>
            ) : (
              <CustomSelect
                value={assetId}
                onChange={(val) => setAssetId(val)}
                placeholder="-- Choose an Available Laptop --"
                options={[
                  { value: '', label: '-- Choose an Available Laptop --' },
                  ...filteredAssets.map((asset) => ({
                    value: String(asset.id),
                    label: `${asset.assetTag} • ${asset.make} ${asset.model}`,
                    subtitle: `${asset.processor || ''} ${asset.ram || ''} ${asset.storage || ''} [Condition: ${asset.condition}]`.trim(),
                  })),
                ]}
                className="w-full"
                buttonClassName="py-2.5 text-xs rounded-xl"
              />
            )}
          </div>

          {/* 2. Select Recipient with Inline Quick-Create Action */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                2. Select Recipient (Student / Employee) *
              </label>

              {/* Add New Student/Employee Inline Trigger */}
              <button
                type="button"
                onClick={() => setQuickCreateOpen(true)}
                className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-bold text-[#D9531E] bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-lg transition"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Add New Student/Employee</span>
              </button>
            </div>

            {/* Recipient Search Filter */}
            <div className="relative mb-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={recipientSearch}
                onChange={(e) => setRecipientSearch(e.target.value)}
                placeholder="Search recipient by name, roll no, employee ID, email..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-brand-500 outline-none"
              />
            </div>

            <CustomSelect
              value={recipientId}
              onChange={(val) => handleRecipientChange(val)}
              placeholder={filteredRecipients.length === 0 ? '-- No Unallocated Recipients Found --' : '-- Choose Eligible Recipient --'}
              options={[
                {
                  value: '',
                  label: filteredRecipients.length === 0
                    ? '-- No Unallocated Recipients Found --'
                    : '-- Choose Eligible Recipient --',
                },
                ...filteredRecipients.map((rec) => {
                  const feeStatus = rec.licenseFeeRecords?.[0]?.status || 'N/A';
                  return {
                    value: String(rec.id),
                    label: `${rec.name} (${rec.rollNumberOrEmpId}) • ${rec.role} • ${rec.department?.code || 'Gen'}`,
                    subtitle: rec.role === 'STUDENT' ? `Fee Status: ${feeStatus}` : undefined,
                  };
                }),
              ]}
              className="w-full"
              buttonClassName="py-2.5 text-xs rounded-xl"
            />

            {/* Recipient Info Card with Phone & Email Badge */}
            {recipientInfo && (
              <div className="mt-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-700 flex flex-wrap items-center gap-x-4 gap-y-1">
                <span className="font-semibold text-slate-900">{recipientInfo.name}</span>
                <span className="text-slate-500">ID: {recipientInfo.rollNumberOrEmpId}</span>
                <span className="text-slate-500">Email: {recipientInfo.email || 'N/A'}</span>
                <span className="text-slate-500">Phone: {recipientInfo.phone || 'N/A'}</span>
              </div>
            )}

            {/* FACULTY / STAFF FEE EXEMPTION NOTICE */}
            {recipientInfo && recipientInfo.role !== 'STUDENT' && (
              <div className="mt-2 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  <strong>Faculty / Institutional Allocation:</strong> Software & maintenance fees are 100% exempt.
                </span>
              </div>
            )}
          </div>

          {/* LICENSE FEE ALERT POPUP / CARD */}
          {feeWarning && (
            <div className="p-4 rounded-xl bg-amber-50 border-2 border-amber-300 shadow-xs animate-scale-up">
              <div className="flex items-start space-x-3">
                <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-amber-900">
                    Software License Fee Clearance Alert
                  </h4>
                  <p className="text-xs text-amber-800 mt-1">{feeWarning.message}</p>
                  <div className="mt-3 flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="feeOverride"
                      checked={overrideWarning}
                      onChange={(e) => setOverrideWarning(e.target.checked)}
                      className="w-4 h-4 text-[#F26522] rounded border-amber-400 focus:ring-brand-500"
                    />
                    <label htmlFor="feeOverride" className="text-xs font-semibold text-amber-900 cursor-pointer">
                      Authorize issuance override (Special Dean / HOD Approval)
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 3. Expected Return Date & Condition */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Expected Return Date
                </label>
                <label className="inline-flex items-center space-x-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={hasExpectedReturnDate}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setHasExpectedReturnDate(checked);
                      if (checked && !expectedReturnDate) {
                        const defaultDue = new Date(Date.now() + 180 * 86400000).toISOString().split('T')[0];
                        setExpectedReturnDate(defaultDue);
                      }
                    }}
                    className="w-4 h-4 text-[#D9531E] rounded border-slate-300 focus:ring-[#D9531E]"
                  />
                  <span className="text-xs font-semibold text-slate-700">Set Expected Return Date</span>
                </label>
              </div>
              <input
                type="date"
                disabled={!hasExpectedReturnDate}
                value={hasExpectedReturnDate ? expectedReturnDate : ''}
                onChange={(e) => setExpectedReturnDate(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:border-[#D9531E] focus:ring-2 focus:ring-[#D9531E]/20 text-xs outline-none text-slate-800 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed transition"
              />
              <p className="text-[11px] text-slate-400">
                {hasExpectedReturnDate
                  ? 'Scheduled return timeline enabled.'
                  : 'Date picker disabled by default. Check box above to configure return date.'}
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Handover Physical Condition
              </label>
              <CustomSelect
                value={issueCondition}
                onChange={(val) => setIssueCondition(val)}
                options={[
                  { value: 'BRAND_NEW', label: 'Brand New' },
                  { value: 'GOOD', label: 'Good / Tested' },
                  { value: 'SCRATCHES', label: 'Minor Scratches' },
                ]}
                className="w-full"
                buttonClassName="py-2 text-xs rounded-xl"
              />
            </div>
          </div>

          {/* 4. Handover Accessory Checklist */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                4. Handover Accessory Checklist
              </label>
              <span className="text-[11px] text-slate-500 font-medium">Select issued accessories</span>
            </div>
            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <label className="flex items-center space-x-2.5 cursor-pointer bg-white p-2 rounded-lg border border-slate-200 hover:border-slate-300 transition">
                <input
                  type="checkbox"
                  checked={accessories.charger}
                  onChange={(e) => setAccessories((prev) => ({ ...prev, charger: e.target.checked }))}
                  className="w-4 h-4 text-[#D9531E] rounded border-slate-300 focus:ring-[#D9531E]"
                />
                <span className="font-semibold text-slate-800">Charger / Adapter</span>
              </label>

              <label className="flex items-center space-x-2.5 cursor-pointer bg-white p-2 rounded-lg border border-slate-200 hover:border-slate-300 transition">
                <input
                  type="checkbox"
                  checked={accessories.bag}
                  onChange={(e) => setAccessories((prev) => ({ ...prev, bag: e.target.checked }))}
                  className="w-4 h-4 text-[#D9531E] rounded border-slate-300 focus:ring-[#D9531E]"
                />
                <span className="font-semibold text-slate-800">Laptop Bag</span>
              </label>

              <label className="flex items-center space-x-2.5 cursor-pointer bg-white p-2 rounded-lg border border-slate-200 hover:border-slate-300 transition">
                <input
                  type="checkbox"
                  checked={accessories.mouse}
                  onChange={(e) => setAccessories((prev) => ({ ...prev, mouse: e.target.checked }))}
                  className="w-4 h-4 text-[#D9531E] rounded border-slate-300 focus:ring-[#D9531E]"
                />
                <span className="font-semibold text-slate-800">External Mouse</span>
              </label>

              <label className="flex items-center space-x-2.5 cursor-pointer bg-white p-2 rounded-lg border border-slate-200 hover:border-slate-300 transition">
                <input
                  type="checkbox"
                  checked={accessories.other}
                  onChange={(e) => setAccessories((prev) => ({ ...prev, other: e.target.checked }))}
                  className="w-4 h-4 text-[#D9531E] rounded border-slate-300 focus:ring-[#D9531E]"
                />
                <span className="font-semibold text-slate-800">Other</span>
              </label>
            </div>

            {accessories.other && (
              <div className="pt-1">
                <input
                  type="text"
                  placeholder="Specify other accessory (e.g. HDMI Cable, LAN Adapter, Stylus)..."
                  value={accessories.otherText}
                  onChange={(e) => setAccessories((prev) => ({ ...prev, otherText: e.target.value }))}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:border-[#D9531E] focus:ring-1 focus:ring-[#D9531E] outline-none bg-white"
                />
              </div>
            )}
          </div>

          {/* 5. Remarks */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              5. Allocation Remarks (Optional)
            </label>
            <textarea
              rows="2"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Handed over with OEM 65W charger and official backpack..."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 text-xs outline-none text-slate-800"
            />
          </div>

          {/* Zero-Conflict Concurrency Lock Notice */}
          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 text-[11px] text-slate-500 flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            <span>Protected by MySQL transaction locks and deferred email dispatch on handover.</span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || (feeWarning && !overrideWarning)}
              className="px-5 py-2 text-xs font-bold text-white bg-[#D9531E] hover:bg-[#b83e0e] disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-xs transition flex items-center space-x-2"
            >
              {loading ? 'Allocating...' : 'Issue Asset'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Inline Quick-Create User Modal */}
      <QuickCreateUserModal
        isOpen={quickCreateOpen}
        onClose={() => setQuickCreateOpen(false)}
        onUserCreated={handleUserCreated}
      />
    </>
  );
};
