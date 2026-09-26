import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { api } from '../../services/api';
import { AlertCircle, RotateCcw, DollarSign, Wrench, CheckCircle2 } from 'lucide-react';

/**
 * ReturnModal Component
 * 
 * Handles physical inspection and return acceptance of an allocated campus laptop.
 * Features:
 * - Physical condition check (GOOD, BRAND_NEW, SCRATCHES, DAMAGED)
 * - Flexible manual Fine / Damage charge logging (e.g. Broken Charger, Screen fault, Missing items)
 * - Fine payment status (PAID vs UNPAID) and payment mode (Cash, UPI, Bank Transfer)
 * - Creates maintenance log and updates asset status inside an atomic MySQL transaction
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Modal visibility flag
 * @param {Function} props.onClose - Dismiss callback
 * @param {Object} props.allocation - The active allocation being returned
 * @param {Function} props.onSuccess - Callback triggered upon successful return
 */
export const ReturnModal = ({ isOpen, onClose, allocation, onSuccess }) => {
  const [returnCondition, setReturnCondition] = useState('GOOD');
  const [notes, setNotes] = useState('');
  const [hasFine, setHasFine] = useState(false);
  const [fineReason, setFineReason] = useState('Charger Damaged / Broken');
  const [customReason, setCustomReason] = useState('');
  const [fineAmount, setFineAmount] = useState('');
  const [finePaid, setFinePaid] = useState(true);
  const [finePaymentMode, setFinePaymentMode] = useState('CASH');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setReturnCondition('GOOD');
      setNotes('');
      setHasFine(false);
      setFineReason('Charger Damaged / Broken');
      setCustomReason('');
      setFineAmount('');
      setFinePaid(true);
      setFinePaymentMode('CASH');
      setError(null);
    }
  }, [isOpen, allocation]);

  if (!allocation) return null;

  // If user marks condition as DAMAGED, automatically prompt for fine assessment
  const handleConditionChange = (cond) => {
    setReturnCondition(cond);
    if (cond === 'DAMAGED' && !hasFine) {
      setHasFine(true);
      if (!fineAmount) setFineAmount('500');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const finalFineReason = fineReason === 'OTHER' ? customReason : fineReason;
      const parsedAmount = hasFine && fineAmount ? Number(fineAmount) : 0;

      const payload = {
        returnCondition,
        notes: notes || null,
        fineAmount: parsedAmount,
        fineReason: parsedAmount > 0 ? (finalFineReason || 'Laptop inspection damage charge') : null,
        finePaid: parsedAmount > 0 ? finePaid : false,
        finePaymentMode: parsedAmount > 0 ? (finePaid ? finePaymentMode : 'PENDING') : null,
      };

      const res = await api.put(`/allocations/${allocation.id}/return`, payload);
      onSuccess(res.data.data.allocation);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to process return.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Accept Laptop Return & Inspection" maxWidth="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
            {error}
          </div>
        )}

        {/* Overview Box */}
        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 text-xs text-slate-600">
          <div className="flex justify-between items-center">
            <span className="font-bold text-slate-800">Laptop Asset:</span>
            <span className="font-mono font-bold text-[#F26522] bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
              {allocation.asset.assetTag}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="font-bold text-slate-800">Model:</span>
            <span className="font-medium text-slate-700">{allocation.asset.make} {allocation.asset.model}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-bold text-slate-800">Issued To:</span>
            <span className="font-medium text-slate-700">
              {allocation.recipient.name} ({allocation.recipient.rollNumberOrEmpId}) • {allocation.recipient.role}
            </span>
          </div>
        </div>

        {/* Physical Condition */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
            Physical Condition Upon Return *
          </label>
          <select
            value={returnCondition}
            onChange={(e) => handleConditionChange(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-[#F26522] focus:ring-2 focus:ring-orange-500/20 text-xs font-semibold outline-none bg-white text-slate-800"
          >
            <option value="GOOD">Good / Tested (Ready for Reissue)</option>
            <option value="BRAND_NEW">Pristine / Like Brand New</option>
            <option value="SCRATCHES">Minor Scratches / Cosmetic Wear</option>
            <option value="DAMAGED">Damaged / Broken Screen / Hardware Fault</option>
          </select>
        </div>

        {returnCondition === 'DAMAGED' && (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600" />
            <span>
              Notice: Marking as <strong>DAMAGED</strong> will automatically set the laptop status to <strong>UNDER_MAINTENANCE</strong> and prompt technical repairs.
            </span>
          </div>
        )}

        {/* DAMAGE / CHARGER DEFECT / FINE CHARGES SECTION */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={hasFine}
                onChange={(e) => {
                  setHasFine(e.target.checked);
                  if (e.target.checked && !fineAmount) {
                    setFineAmount('500');
                  }
                }}
                className="w-4 h-4 text-[#F26522] rounded border-slate-300 focus:ring-orange-500/20 cursor-pointer"
              />
              <span className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                <Wrench className="w-3.5 h-3.5 text-orange-600" />
                <span>Damage / Broken Charger / Penalty Charge Entry</span>
              </span>
            </label>
            {hasFine && (
              <span className="text-[10px] font-bold text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full">
                Active Assessment
              </span>
            )}
          </div>

          {hasFine && (
            <div className="pt-2.5 border-t border-slate-200 space-y-3 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Reason Dropdown */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Problem / Damage Reason *
                  </label>
                  <select
                    value={fineReason}
                    onChange={(e) => setFineReason(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-[#F26522] outline-none bg-white font-medium"
                  >
                    <option value="Charger Damaged / Broken">Charger Damaged / Broken (₹500 - ₹1200)</option>
                    <option value="Charger Missing">Charger Missing / Not Returned</option>
                    <option value="Screen Damaged / Lines">Screen Damaged / Display Issue</option>
                    <option value="Keyboard / Touchpad Defect">Keyboard / Key Missing / Spill</option>
                    <option value="Laptop Bag Damaged / Missing">Laptop Bag Damaged / Missing</option>
                    <option value="Body Dent / Casing Cracked">Body Dent / Casing Cracked</option>
                    <option value="OTHER">Other Custom Defect / Reason</option>
                  </select>
                </div>

                {/* Fine Amount (Manual Input) */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Fine / Repair Amount (₹) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={fineAmount}
                    onChange={(e) => setFineAmount(e.target.value)}
                    placeholder="e.g. 500, 1000, 1500"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-[#F26522] focus:ring-2 focus:ring-orange-500/20 outline-none font-bold text-slate-900"
                    required={hasFine}
                  />
                </div>
              </div>

              {fineReason === 'OTHER' && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Specify Custom Problem / Damage *
                  </label>
                  <input
                    type="text"
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    placeholder="Describe specific hardware defect or broken accessory..."
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-[#F26522] outline-none"
                    required={fineReason === 'OTHER'}
                  />
                </div>
              )}

              {/* Payment Status & Mode */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Fine Payment Status
                  </label>
                  <div className="flex items-center space-x-3 mt-1.5">
                    <label className="flex items-center space-x-1.5 text-xs font-semibold cursor-pointer">
                      <input
                        type="radio"
                        name="finePaid"
                        checked={finePaid === true}
                        onChange={() => setFinePaid(true)}
                        className="text-[#F26522] focus:ring-orange-500"
                      />
                      <span className="text-emerald-700">PAID (Collected Now)</span>
                    </label>
                    <label className="flex items-center space-x-1.5 text-xs font-semibold cursor-pointer">
                      <input
                        type="radio"
                        name="finePaid"
                        checked={finePaid === false}
                        onChange={() => setFinePaid(false)}
                        className="text-rose-600 focus:ring-rose-500"
                      />
                      <span className="text-rose-700">UNPAID (Pending)</span>
                    </label>
                  </div>
                </div>

                {finePaid && (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Payment Mode
                    </label>
                    <select
                      value={finePaymentMode}
                      onChange={(e) => setFinePaymentMode(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 focus:border-[#F26522] outline-none bg-white font-medium"
                    >
                      <option value="CASH">Cash (Cash Counter)</option>
                      <option value="UPI">UPI / QR Code</option>
                      <option value="BANK_TRANSFER">Bank Transfer / IMPS</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="p-2.5 rounded-lg bg-orange-50/70 border border-orange-200/80 text-[11px] text-orange-950 flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-orange-600 shrink-0" />
                <span>
                  This entry will be recorded in the Issue/Return Ledger, logged under Repairs & Maintenance, and included in the return receipt.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Return Notes */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
            Return Inspection Remarks & Notes
          </label>
          <textarea
            rows="2"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Charger inspected and verified, carry bag returned in good order..."
            className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:border-[#F26522] focus:ring-2 focus:ring-orange-500/20 text-xs outline-none text-slate-800"
          />
        </div>

        <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 text-xs font-bold text-white bg-[#F26522] hover:bg-orange-600 rounded-xl shadow-md transition flex items-center space-x-2 disabled:opacity-50"
          >
            <RotateCcw className="w-4 h-4" />
            <span>{loading ? 'Processing Return...' : 'Complete Return & Save Entry'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
