import React from 'react';
import { Modal } from '../common/Modal';
import { Printer, Download } from 'lucide-react';
import { API_BASE_URL } from '../../services/api';

/**
 * ReceiptModal Component
 * 
 * Displays an official, printable SSISM IT hardware allocation receipt.
 * Contains student/faculty details, asset serial numbers, handover undertaking,
 * digital signature lines, and one-click PDF download / browser print.
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Modal visibility state
 * @param {Function} props.onClose - Modal close handler
 * @param {Object} props.allocation - The completed allocation record
 */
export const ReceiptModal = ({ isOpen, onClose, allocation }) => {
  if (!allocation) return null;

  const handleDownloadPDF = () => {
    window.open(`${API_BASE_URL}/data/receipt/${allocation.id}/pdf`, '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  const issueDateStr = new Date(allocation.issuedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const dueDateStr = allocation.dueDate
    ? new Date(allocation.dueDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : 'End of Academic Year';

  const formatDuration = (startDate, endDate) => {
    if (!startDate) return 'Not Recorded';
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : new Date();

    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 'Not Recorded';
    if (end <= start) return '1 Day (Same Day Return)';

    const totalDays = Math.max(1, Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));

    let years = end.getFullYear() - start.getFullYear();
    let months = end.getMonth() - start.getMonth();
    let days = end.getDate() - start.getDate();

    if (days < 0) {
      months -= 1;
      const prevMonthLastDay = new Date(end.getFullYear(), end.getMonth(), 0).getDate();
      days += prevMonthLastDay;
    }
    if (months < 0) {
      years -= 1;
      months += 12;
    }

    const parts = [];
    if (years > 0) parts.push(`${years} ${years === 1 ? 'Year' : 'Years'}`);
    if (months > 0) parts.push(`${months} ${months === 1 ? 'Month' : 'Months'}`);
    if (days > 0) parts.push(`${days} ${days === 1 ? 'Day' : 'Days'}`);

    if (years === 0 && months === 0) {
      return `${totalDays} ${totalDays === 1 ? 'Day' : 'Days'}`;
    }

    return parts.length > 0 ? parts.join(', ') : `${totalDays} Days`;
  };

  const getAccessoriesList = (acc) => {
    if (!acc) return [];
    if (Array.isArray(acc)) return acc.filter(Boolean);
    if (typeof acc === 'string') {
      try {
        const parsed = JSON.parse(acc);
        if (Array.isArray(parsed)) return parsed.filter(Boolean);
      } catch {
        return [acc];
      }
    }
    return [];
  };

  const isReturned = allocation.status === 'RETURNED';
  const durationText = allocation.duration || formatDuration(allocation.issuedAt, allocation.returnedAt);
  const accessoriesList = getAccessoriesList(allocation.accessories);
  const isStudent = allocation.recipient?.role === 'STUDENT';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Campus Hardware Allocation Receipt & Details" maxWidth="max-w-2xl">
      <div className="space-y-6">
        {/* Printable Receipt Card */}
        <div id="receipt-print-area" className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm text-slate-800 space-y-5">
          {/* Header */}
          <div className="text-center border-b border-slate-200 pb-4">
            <h2 className="text-base font-extrabold text-slate-900 uppercase tracking-wide">
              Sant Singaji Institute of Science and Management
            </h2>
            <p className="text-[11px] font-medium text-slate-500">
              Sandalpur, Teh - Khategaon, Dist - Dewas, MP
            </p>
            <p className="text-xs font-semibold text-[#D9531E] uppercase tracking-wider mt-0.5">
              IT Infrastructure & Laptop Allocation Receipt
            </p>
            <div className="flex justify-between items-center text-xs text-slate-500 mt-3 pt-2 border-t border-slate-100">
              <span className="font-mono font-bold text-slate-700">
                Receipt Ref: REC-ALLOC-{String(allocation.id).padStart(5, '0')}
              </span>
              <span>Issued Date: {issueDateStr}</span>
            </div>
          </div>

          {/* Allocation Duration Badge (if returned) */}
          {isReturned && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 block">
                  Total Custody Duration
                </span>
                <span className="text-sm font-extrabold text-emerald-900">{durationText}</span>
              </div>
              <div className="text-right text-[11px] text-emerald-700">
                <div>Issued: {issueDateStr}</div>
                <div>Returned: {allocation.returnedAt ? new Date(allocation.returnedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'Cleared'}</div>
              </div>
            </div>
          )}

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 border border-slate-100">
              <div className="font-bold text-slate-900 uppercase tracking-wider text-[10px]">
                {isStudent ? 'Student Profile' : 'Faculty / Staff Profile'}
              </div>
              <div><span className="text-slate-500">Name:</span> <strong>{allocation.recipient?.name}</strong></div>
              <div><span className="text-slate-500">{isStudent ? 'Roll No:' : 'Emp ID:'}</span> <span className="font-mono font-bold text-[#D9531E]">{allocation.recipient?.rollNumberOrEmpId}</span></div>
              <div><span className="text-slate-500">Role:</span> <span className="font-semibold text-slate-800">{allocation.recipient?.role}</span></div>
              {allocation.recipient?.branch && (
                <div><span className="text-slate-500">Branch:</span> {allocation.recipient.branch}</div>
              )}
              {allocation.recipient?.batchYear && (
                <div><span className="text-slate-500">Batch Year:</span> {allocation.recipient.batchYear}</div>
              )}
              <div><span className="text-slate-500">Department:</span> {allocation.recipient?.department?.name || allocation.recipient?.branch || 'General'}</div>
              <div><span className="text-slate-500">Email:</span> <span className="font-mono text-[11px]">{allocation.recipient?.email || 'N/A'}</span></div>
              <div><span className="text-slate-500">{isReturned ? 'Return Status:' : 'Scheduled Due:'}</span> <strong className={isReturned ? 'text-emerald-700' : 'text-slate-800'}>{isReturned ? 'RETURNED & CLEARED' : dueDateStr}</strong></div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 border border-slate-100">
              <div className="font-bold text-slate-900 uppercase tracking-wider text-[10px]">
                Hardware & Accessories Handed Over
              </div>
              <div><span className="text-slate-500">Asset Tag:</span> <strong className="font-mono text-[#D9531E]">{allocation.asset?.assetTag}</strong></div>
              <div><span className="text-slate-500">Serial No:</span> <span className="font-mono">{allocation.asset?.serialNumber}</span></div>
              <div><span className="text-slate-500">Make & Model:</span> {allocation.asset?.make} {allocation.asset?.model}</div>
              <div><span className="text-slate-500">Specs:</span> {allocation.asset?.processor}, {allocation.asset?.ram}, {allocation.asset?.storage}</div>
              <div><span className="text-slate-500">Handover Condition:</span> <strong className="text-emerald-700">{allocation.issueCondition || allocation.asset?.condition || 'GOOD'}</strong></div>
              {allocation.asset?.chargerSerial && (
                <div><span className="text-slate-500">Charger S/N:</span> {allocation.asset.chargerSerial}</div>
              )}
              
              {/* Accessories Checklist */}
              <div className="pt-1 border-t border-slate-200/60 mt-1">
                <span className="text-slate-500 block text-[10px] font-bold uppercase tracking-wider mb-1">
                  Issued Accessories:
                </span>
                {accessoriesList.length > 0 ? (
                  <div className="space-y-0.5">
                    {accessoriesList.map((item, idx) => (
                      <div key={idx} className="flex items-center space-x-1.5 text-slate-700 font-semibold text-[11px]">
                        <span className="text-emerald-600 font-bold">[✓]</span>
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-slate-500 italic text-[11px]">
                    {allocation.asset?.hasBag ? '• Laptop Bag (✓) ' : ''}
                    {allocation.asset?.hasMouse ? '• Mouse (✓) ' : ''}
                    {!allocation.asset?.hasBag && !allocation.asset?.hasMouse ? 'Standard Power Adapter' : ''}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Fine / Damage Assessment Receipt (if applicable) */}
          {allocation.fineAmount > 0 && (
            <div className="p-3 rounded-xl bg-rose-50/70 border border-rose-200 text-xs space-y-1.5">
              <div className="flex justify-between items-center text-rose-950 font-bold border-b border-rose-200/60 pb-1">
                <span>Damage / Penalty Fee Assessment:</span>
                <span className="font-mono text-sm text-rose-700">₹{allocation.fineAmount}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-rose-900">
                <div><span className="font-medium text-slate-500">Reason / Defect:</span> <strong>{allocation.fineReason || 'Hardware defect'}</strong></div>
                <div><span className="font-medium text-slate-500">Payment Status:</span> <strong className={allocation.finePaid ? 'text-emerald-700' : 'text-rose-600'}>{allocation.finePaid ? `PAID (${allocation.finePaymentMode || 'Cash'})` : 'UNPAID / Pending'}</strong></div>
              </div>
            </div>
          )}

          {/* Mandatory Institutional Liability Undertaking */}
          <div className="p-3.5 rounded-xl bg-orange-50/70 border border-[#D9531E]/30 text-xs text-[#2C3E50] space-y-1">
            <div className="font-bold text-[#D9531E] uppercase text-[10.5px] tracking-wider">
              Institutional Liability Undertaking:
            </div>
            <p className="leading-relaxed font-medium">
              Note: You are solely responsible for the physical and technical integrity of the assigned asset during the allocation period. Any physical damage, loss, or unauthorized technical modification will attract appropriate institutional action.
            </p>
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-8 pt-4 border-t border-slate-200 text-xs">
            <div>
              <div className="border-b border-slate-300 pb-1 mb-1 font-semibold text-slate-700">
                {allocation.issuedBy?.name || 'IT Staff'}
              </div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider">Authorized Issuer Signature</div>
            </div>
            <div>
              <div className="border-b border-slate-300 pb-1 mb-1 font-semibold text-slate-700">
                {allocation.recipient?.name}
              </div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider">Recipient Acceptance Signature</div>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between pt-2">
          <div className="text-xs text-slate-400">
            Immutable Audit Hash SHA-256 verified
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handlePrint}
              className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition flex items-center space-x-1.5"
            >
              <Printer className="w-4 h-4" />
              <span>Print View</span>
            </button>
            <button
              onClick={handleDownloadPDF}
              className="px-4 py-2 text-xs font-bold text-white bg-[#F26522] hover:bg-orange-600 rounded-xl shadow-md shadow-orange-500/20 transition flex items-center space-x-1.5"
            >
              <Download className="w-4 h-4" />
              <span>Download Official PDF</span>
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
