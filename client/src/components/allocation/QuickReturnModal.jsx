import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { api } from '../../services/api';
import { Badge } from '../common/Badge';
import {
  RotateCcw,
  Search,
  Laptop,
  User,
  AlertCircle,
  Wrench,
  CheckCircle2,
  Calendar,
  Clock,
  Printer,
  FileCheck,
  Mail,
  ChevronRight,
  ArrowLeft,
} from 'lucide-react';

/**
 * QuickReturnModal Component
 * 
 * Direct Return & Physical Inspection Desk accessible directly from Dashboard & Allocations.
 * Features:
 * 1. Instant live search across active laptop custody records (by Asset Tag, Serial, Student Name, Roll No, Emp ID).
 * 2. Detailed Hardware & Recipient inspection review.
 * 3. Physical condition evaluation (GOOD, BRAND_NEW, SCRATCHES, DAMAGED).
 * 4. Damage / Broken Charger / Penalty fine entry with cash/UPI tracking.
 * 5. Automatic email return clearance receipt delivery to student/employee.
 * 6. One-click clearance certificate preview and print capability.
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Visibility flag
 * @param {Function} props.onClose - Modal close callback
 * @param {Object} [props.initialAllocation] - Pre-selected allocation (optional)
 * @param {Function} props.onSuccess - Success callback (passes updated allocation)
 * @param {Function} [props.onOpenReceipt] - Callback to open printable receipt modal
 */
export const QuickReturnModal = ({
  isOpen,
  onClose,
  initialAllocation = null,
  onSuccess,
  onOpenReceipt,
}) => {
  // Active allocations & selection state
  const [activeAllocations, setActiveAllocations] = useState([]);
  const [loadingActive, setLoadingActive] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedAllocation, setSelectedAllocation] = useState(initialAllocation);

  // Return inspection form state
  const [returnCondition, setReturnCondition] = useState('GOOD');
  const [notes, setNotes] = useState('');
  const [hasFine, setHasFine] = useState(false);
  const [fineReason, setFineReason] = useState('Charger Damaged / Broken');
  const [customReason, setCustomReason] = useState('');
  const [fineAmount, setFineAmount] = useState('');
  const [finePaid, setFinePaid] = useState(true);
  const [finePaymentMode, setFinePaymentMode] = useState('CASH');
  const [sendEmailReceipt, setSendEmailReceipt] = useState(true);

  // Submission state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [completedReturn, setCompletedReturn] = useState(null);

  // Reset form or load active allocations when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedAllocation(initialAllocation);
      setReturnCondition('GOOD');
      setNotes('');
      setHasFine(false);
      setFineReason('Charger Damaged / Broken');
      setCustomReason('');
      setFineAmount('');
      setFinePaid(true);
      setFinePaymentMode('CASH');
      setSendEmailReceipt(true);
      setError(null);
      setCompletedReturn(null);
      setSearch('');

      // Fetch active allocations if no pre-selected allocation
      if (!initialAllocation) {
        fetchActiveAllocations();
      }
    }
  }, [isOpen, initialAllocation]);

  const fetchActiveAllocations = async () => {
    setLoadingActive(true);
    try {
      const res = await api.get('/allocations', {
        params: { status: 'ACTIVE', limit: 100 },
      });
      setActiveAllocations(res.data.data?.allocations || []);
    } catch (err) {
      console.error('Failed to load active allocations for return desk:', err);
    } finally {
      setLoadingActive(false);
    }
  };

  // Filter active allocations based on search query
  const filteredAllocations = activeAllocations.filter((item) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const tag = (item.asset?.assetTag || '').toLowerCase();
    const serial = (item.asset?.serialNumber || '').toLowerCase();
    const make = (item.asset?.make || '').toLowerCase();
    const model = (item.asset?.model || '').toLowerCase();
    const name = (item.recipient?.name || '').toLowerCase();
    const roll = (item.recipient?.rollNumberOrEmpId || '').toLowerCase();
    const email = (item.recipient?.email || '').toLowerCase();

    return (
      tag.includes(q) ||
      serial.includes(q) ||
      make.includes(q) ||
      model.includes(q) ||
      name.includes(q) ||
      roll.includes(q) ||
      email.includes(q)
    );
  });

  // Handle condition change
  const handleConditionChange = (cond) => {
    setReturnCondition(cond);
    if (cond === 'DAMAGED' && !hasFine) {
      setHasFine(true);
      if (!fineAmount) setFineAmount('500');
    }
  };

  // Process return submission
  const handleSubmitReturn = async (e) => {
    e.preventDefault();
    if (!selectedAllocation) return;

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

      const res = await api.put(`/allocations/${selectedAllocation.id}/return`, payload);
      const returnedData = res.data.data.allocation;

      // On-demand email receipt confirmation if toggled
      if (sendEmailReceipt) {
        api.post(`/allocations/${selectedAllocation.id}/send-email`).catch((e) => {
          console.warn('Auto-email receipt dispatch notice:', e.message);
        });
      }

      setCompletedReturn(returnedData);
      if (onSuccess) {
        onSuccess(returnedData);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to process return clearance.');
    } finally {
      setLoading(false);
    }
  };

  // Handle opening printable clearance receipt
  const handleViewReceipt = () => {
    if (onOpenReceipt && completedReturn) {
      onClose();
      onOpenReceipt(completedReturn);
    }
  };

  // Helper for overdue check
  const isOverdue = (dueDate) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200">
            <RotateCcw className="w-4 h-4" />
          </div>
          <div>
            <span className="text-base font-extrabold text-slate-900">
              Laptop Return & Submission Desk
            </span>
            <span className="block text-[11px] font-semibold text-slate-500">
              Quick hardware surrender, physical inspection & clearance receipt
            </span>
          </div>
        </div>
      }
      maxWidth="max-w-2xl"
    >
      {/* SUCCESS STATE */}
      {completedReturn ? (
        <div className="space-y-6 py-4 animate-fade-in text-center">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner border border-emerald-200">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <div className="space-y-1">
            <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Laptop Successfully Returned & Cleared!
            </h3>
            <p className="text-xs text-slate-600 max-w-md mx-auto">
              Hardware asset <strong className="font-mono text-emerald-700">{completedReturn.asset?.assetTag}</strong> has been returned into campus inventory.
              Custody record has been discharged.
            </p>
          </div>

          {/* Clearance Summary Pill */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-left max-w-lg mx-auto space-y-2 text-xs">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
              <span className="font-bold text-slate-600">Clearance Ref:</span>
              <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                REC-CLEAR-{String(completedReturn.id).padStart(5, '0')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-slate-500">Recipient:</span>
              <span className="font-bold text-slate-800">
                {completedReturn.recipient?.name} ({completedReturn.recipient?.rollNumberOrEmpId})
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-slate-500">Laptop:</span>
              <span className="font-semibold text-slate-800">
                {completedReturn.asset?.make} {completedReturn.asset?.model}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-slate-500">Inspection Condition:</span>
              <Badge status={completedReturn.returnCondition} size="xs" />
            </div>
            {completedReturn.fineAmount > 0 && (
              <div className="flex justify-between text-rose-700 font-semibold">
                <span>Penalty Assessed:</span>
                <span>₹{completedReturn.fineAmount} ({completedReturn.finePaid ? 'PAID' : 'UNPAID'})</span>
              </div>
            )}
            {sendEmailReceipt && completedReturn.recipient?.email && (
              <div className="pt-2 border-t border-slate-200 flex items-center space-x-1.5 text-[11px] text-emerald-700 font-semibold">
                <Mail className="w-3.5 h-3.5" />
                <span>Automated clearance receipt dispatched to {completedReturn.recipient?.email}</span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            {onOpenReceipt && (
              <button
                type="button"
                onClick={handleViewReceipt}
                className="px-4 py-2.5 rounded-xl bg-[#F26522] hover:bg-orange-600 text-white font-bold text-xs shadow-md shadow-orange-500/20 flex items-center space-x-2 transition"
              >
                <Printer className="w-4 h-4" />
                <span>Print / Download Receipt</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setCompletedReturn(null);
                setSelectedAllocation(null);
                fetchActiveAllocations();
              }}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs transition flex items-center space-x-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Submit Another Laptop</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-bold text-xs transition"
            >
              Done & Close
            </button>
          </div>
        </div>
      ) : !selectedAllocation ? (
        /* STEP 1: SELECT ACTIVE ALLOCATION TO RETURN */
        <div className="space-y-4">
          <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-xl text-xs text-emerald-900 flex items-start space-x-2.5">
            <RotateCcw className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Direct Return Access:</span> Select the student or laptop being surrendered.
              Search by student name, roll number, employee ID, or asset tag to start the inspection.
            </div>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by student name, roll no, employee ID, or asset tag (e.g. LP/2025/001)..."
              className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-xs font-medium outline-none bg-white text-slate-800"
              autoFocus
            />
          </div>

          {/* List of Active Allocations */}
          <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
            {loadingActive ? (
              <div className="py-12 text-center text-xs text-slate-500 font-semibold">
                <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                Loading active laptop custody records...
              </div>
            ) : filteredAllocations.length === 0 ? (
              <div className="py-12 text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl p-6">
                <Laptop className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-700">No matching active allocations found</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {search ? 'Try adjusting your search query' : 'All campus laptops are currently in stock!'}
                </p>
              </div>
            ) : (
              filteredAllocations.map((alloc) => {
                const overdue = isOverdue(alloc.dueDate);
                return (
                  <div
                    key={alloc.id}
                    onClick={() => setSelectedAllocation(alloc)}
                    className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-2xs hover:border-emerald-500 hover:bg-emerald-50/20 cursor-pointer transition-all duration-150 flex items-center justify-between group"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 group-hover:bg-emerald-100 text-slate-600 group-hover:text-emerald-700 flex items-center justify-center shrink-0 transition">
                        <Laptop className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-xs font-bold text-[#F26522] bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
                            {alloc.asset?.assetTag}
                          </span>
                          <span className="text-xs font-bold text-slate-900 truncate">
                            {alloc.recipient?.name}
                          </span>
                          <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                            {alloc.recipient?.rollNumberOrEmpId}
                          </span>
                        </div>
                        <div className="flex items-center space-x-3 text-[11px] text-slate-500 mt-1">
                          <span className="truncate">{alloc.asset?.make} {alloc.asset?.model}</span>
                          <span>•</span>
                          <span>{alloc.recipient?.role}</span>
                          {alloc.dueDate && (
                            <>
                              <span>•</span>
                              <span className={overdue ? 'text-rose-600 font-bold flex items-center space-x-1' : 'text-slate-400'}>
                                {overdue && <AlertCircle className="w-3 h-3 inline mr-0.5" />}
                                <span>Due: {new Date(alloc.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0 ml-3">
                      {overdue && (
                        <span className="text-[10px] font-extrabold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                          Overdue
                        </span>
                      )}
                      <span className="px-3 py-1.5 rounded-lg bg-emerald-600 group-hover:bg-emerald-700 text-white font-bold text-xs flex items-center space-x-1 shadow-xs transition">
                        <span>Select</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        /* STEP 2: PHYSICAL INSPECTION & CLEARANCE FORM */
        <form onSubmit={handleSubmitReturn} className="space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Selected Device & Recipient Header Bar */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-3">
            <div className="flex items-center space-x-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-orange-100 text-[#F26522] flex items-center justify-center shrink-0">
                <Laptop className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-xs font-bold text-[#F26522] bg-white px-2 py-0.5 rounded border border-orange-200">
                    {selectedAllocation.asset?.assetTag}
                  </span>
                  <span className="text-xs font-extrabold text-slate-900 truncate">
                    {selectedAllocation.asset?.make} {selectedAllocation.asset?.model}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Assigned to: <strong className="text-slate-800">{selectedAllocation.recipient?.name}</strong> ({selectedAllocation.recipient?.rollNumberOrEmpId}) • {selectedAllocation.recipient?.role}
                </div>
              </div>
            </div>

            {!initialAllocation && (
              <button
                type="button"
                onClick={() => setSelectedAllocation(null)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 hover:bg-white text-slate-600 font-bold text-[11px] flex items-center space-x-1 shrink-0 transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Change</span>
              </button>
            )}
          </div>

          {/* Physical Condition Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Physical Condition Upon Return *
            </label>
            <select
              value={returnCondition}
              onChange={(e) => handleConditionChange(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-xs font-semibold outline-none bg-white text-slate-800"
            >
              <option value="GOOD">Good / Tested (Ready for Reissue)</option>
              <option value="BRAND_NEW">Pristine / Like Brand New</option>
              <option value="SCRATCHES">Minor Scratches / Cosmetic Wear</option>
              <option value="DAMAGED">Damaged / Broken Screen / Hardware Fault</option>
            </select>
          </div>

          {returnCondition === 'DAMAGED' && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                <strong>Maintenance Alert:</strong> Marking this laptop as <strong>DAMAGED</strong> will automatically shift its status to <strong>UNDER_MAINTENANCE</strong> and open an IT repair ticket.
              </span>
            </div>
          )}

          {/* Penalty / Charger / Defect Fine Entry */}
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
                  className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500/20 cursor-pointer"
                />
                <span className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                  <Wrench className="w-3.5 h-3.5 text-orange-600" />
                  <span>Damage / Broken Charger / Penalty Charge Entry</span>
                </span>
              </label>
              {hasFine && (
                <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                  Penalty Assessed
                </span>
              )}
            </div>

            {hasFine && (
              <div className="space-y-3 pt-2 border-t border-slate-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Charge Reason / Defect Type *
                    </label>
                    <select
                      value={fineReason}
                      onChange={(e) => setFineReason(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium bg-white outline-none focus:border-emerald-500"
                    >
                      <option value="Charger Damaged / Broken">Charger Damaged / Broken</option>
                      <option value="Missing Power Adapter / Cable">Missing Power Adapter / Cable</option>
                      <option value="Screen Scratch / Cracked Display">Screen Scratch / Cracked Display</option>
                      <option value="Body Dent / Casing Cracked">Body Dent / Casing Cracked</option>
                      <option value="Keyboard Keys Missing / Liquid Spill">Keyboard Keys Missing / Liquid Spill</option>
                      <option value="Missing Laptop Bag / Accessories">Missing Laptop Bag / Accessories</option>
                      <option value="OTHER">Other Reason (Specify below)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Fine Amount (INR ₹) *
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="50"
                      value={fineAmount}
                      onChange={(e) => setFineAmount(e.target.value)}
                      placeholder="e.g. 500"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold bg-white outline-none focus:border-emerald-500"
                      required={hasFine}
                    />
                  </div>
                </div>

                {fineReason === 'OTHER' && (
                  <div>
                    <input
                      type="text"
                      value={customReason}
                      onChange={(e) => setCustomReason(e.target.value)}
                      placeholder="Specify custom damage reason..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white outline-none focus:border-emerald-500"
                      required={fineReason === 'OTHER'}
                    />
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-4 text-xs">
                  <span className="font-bold text-slate-700">Payment Status:</span>
                  <label className="flex items-center space-x-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="finePaid"
                      checked={finePaid}
                      onChange={() => setFinePaid(true)}
                      className="text-emerald-600"
                    />
                    <span className="font-semibold text-emerald-800">Collected Now (PAID)</span>
                  </label>
                  <label className="flex items-center space-x-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="finePaid"
                      checked={!finePaid}
                      onChange={() => setFinePaid(false)}
                      className="text-rose-600"
                    />
                    <span className="font-semibold text-rose-700">Pending / Unpaid</span>
                  </label>

                  {finePaid && (
                    <select
                      value={finePaymentMode}
                      onChange={(e) => setFinePaymentMode(e.target.value)}
                      className="px-2.5 py-1 rounded-lg border border-slate-300 text-xs bg-white font-medium ml-auto"
                    >
                      <option value="CASH">Cash Collection</option>
                      <option value="UPI">UPI / QR Code</option>
                      <option value="BANK_TRANSFER">Bank Transfer / NEFT</option>
                    </select>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Remarks Notes */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Inspection Remarks / Return Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Verified working charger returned, tested bootup & touchpad OK..."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-xs outline-none bg-white text-slate-800"
            />
          </div>

          {/* Automated Email Receipt Toggle */}
          <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200/60 flex items-center justify-between">
            <label className="flex items-center space-x-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={sendEmailReceipt}
                onChange={(e) => setSendEmailReceipt(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500/20 cursor-pointer"
              />
              <span className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                <Mail className="w-3.5 h-3.5 text-emerald-600" />
                <span>Send Auto-Email Return Clearance Receipt to Recipient</span>
              </span>
            </label>
            <span className="text-[11px] font-mono text-emerald-700 font-semibold truncate max-w-[200px]">
              {selectedAllocation.recipient?.email || 'No email registered'}
            </span>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-500/25 flex items-center space-x-2 transition active:scale-95 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Clearing Return...</span>
                </>
              ) : (
                <>
                  <RotateCcw className="w-4 h-4" />
                  <span>Accept Return & Clear Laptop</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};
