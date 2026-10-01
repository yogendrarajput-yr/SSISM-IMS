import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { api } from '../../services/api';
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle,
  Wrench,
  HelpCircle,
  Laptop,
  User,
} from 'lucide-react';

/**
 * PhysicalVerifyModal Component
 * 
 * Enables administrators & IT technicians to record on-ground physical custody
 * audits for laptops. Captures verification status, inspector ID, timestamp,
 * and observational notes.
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Modal visibility flag
 * @param {Function} props.onClose - Modal close handler
 * @param {Object} props.asset - Asset instance to be physically audited
 * @param {Function} props.onSuccess - Callback triggered upon successful verification
 */
export const PhysicalVerifyModal = ({ isOpen, onClose, asset, onSuccess }) => {
  const [auditStatus, setAuditStatus] = useState('PHYSICAL_OK');
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!asset) return null;

  const activeAlloc = asset.allocations?.find((a) => a.status === 'ACTIVE') || asset.activeAllocation;
  const currentHolder = activeAlloc?.recipient || asset.currentHolder;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await api.post(`/assets/${asset.id}/verify`, {
        auditStatus,
        remarks: remarks.trim() || undefined,
      });

      if (onSuccess) {
        onSuccess(res.data?.data?.asset);
      }
      onClose();
    } catch (err) {
      console.error('Physical verification failed:', err);
      setError(err.response?.data?.message || 'Failed to record physical verification.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Physical Audit & Verification Check"
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start space-x-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Asset Identity Card */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-800 flex items-center space-x-1.5">
              <Laptop className="w-3.5 h-3.5 text-[#F26522]" />
              <span>{asset.assetTag}</span>
            </span>
            <span className="text-[11px] font-semibold text-slate-500">
              S/N: {asset.serialNumber}
            </span>
          </div>
          <div className="text-slate-600">
            {asset.make} {asset.model} • {asset.processor}
          </div>

          {currentHolder ? (
            <div className="pt-2 mt-2 border-t border-slate-200/80 flex items-center space-x-1.5 text-slate-700">
              <User className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              <span>
                <strong>Assigned To:</strong> {currentHolder.name} ({currentHolder.rollNumberOrEmpId}) [{currentHolder.role}]
              </span>
            </div>
          ) : (
            <div className="pt-1.5 text-[11px] text-emerald-600 font-semibold">
              Currently in Central IT Stock (Unallocated)
            </div>
          )}
        </div>

        {/* Verification Status Selector */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
            Physical Inspection Status *
          </label>
          <div className="grid grid-cols-3 gap-2">
            {/* PHYSICAL_OK */}
            <button
              type="button"
              onClick={() => setAuditStatus('PHYSICAL_OK')}
              className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center justify-center space-y-1 ${
                auditStatus === 'PHYSICAL_OK'
                  ? 'bg-emerald-50 border-emerald-500 text-emerald-800 font-bold shadow-xs'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span className="text-[11px] leading-tight">Physical OK</span>
            </button>

            {/* NEEDS_REPAIR */}
            <button
              type="button"
              onClick={() => setAuditStatus('NEEDS_REPAIR')}
              className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center justify-center space-y-1 ${
                auditStatus === 'NEEDS_REPAIR'
                  ? 'bg-amber-50 border-amber-500 text-amber-800 font-bold shadow-xs'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              <Wrench className="w-4 h-4 text-amber-600" />
              <span className="text-[11px] leading-tight">Needs Repair</span>
            </button>

            {/* MISSING */}
            <button
              type="button"
              onClick={() => setAuditStatus('MISSING')}
              className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center justify-center space-y-1 ${
                auditStatus === 'MISSING'
                  ? 'bg-rose-50 border-rose-500 text-rose-800 font-bold shadow-xs'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              <HelpCircle className="w-4 h-4 text-rose-600" />
              <span className="text-[11px] leading-tight">Missing</span>
            </button>
          </div>
        </div>

        {/* Remarks / Audit Notes */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
            Verification Remarks & Observations
          </label>
          <textarea
            rows="3"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="e.g., Physical screen, chassis, and OEM charger verified in person with student during lab session..."
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#F26522]/30 focus:border-[#F26522] outline-none"
          />
        </div>

        {/* Notice */}
        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 text-[11px] text-slate-500 flex items-center space-x-2">
          <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>Records verified timestamp and links inspector identity to the permanent audit log.</span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 text-xs font-bold text-white bg-[#F26522] hover:bg-orange-600 disabled:opacity-50 rounded-xl shadow-xs transition flex items-center space-x-1.5"
          >
            {loading ? 'Recording...' : 'Save Verification'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
