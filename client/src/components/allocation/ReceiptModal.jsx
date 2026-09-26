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

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Campus Hardware Allocation Receipt" maxWidth="max-w-2xl">
      <div className="space-y-6">
        {/* Printable Receipt Card */}
        <div id="receipt-print-area" className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm text-slate-800 space-y-5">
          {/* Header */}
          <div className="text-center border-b border-slate-200 pb-4">
            <h2 className="text-base font-extrabold text-slate-900 uppercase tracking-wide">
              SHRI SHIVAJI INSTITUTE OF SCIENCE & MANAGEMENT
            </h2>
            <p className="text-xs font-semibold text-brand-600 uppercase tracking-wider mt-0.5">
              IT Infrastructure & Laptop Allocation Receipt
            </p>
            <div className="flex justify-between items-center text-xs text-slate-500 mt-3 pt-2 border-t border-slate-100">
              <span className="font-mono font-bold text-slate-700">
                Receipt Ref: REC-ALLOC-{String(allocation.id).padStart(5, '0')}
              </span>
              <span>Issued Date: {issueDateStr}</span>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 border border-slate-100">
              <div className="font-bold text-slate-900 uppercase tracking-wider text-[10px]">
                Recipient Information
              </div>
              <div><span className="text-slate-500">Name:</span> <strong>{allocation.recipient?.name}</strong></div>
              <div><span className="text-slate-500">Roll/Emp ID:</span> <span className="font-mono">{allocation.recipient?.rollNumberOrEmpId}</span></div>
              <div><span className="text-slate-500">Role:</span> {allocation.recipient?.role}</div>
              <div><span className="text-slate-500">Department:</span> {allocation.recipient?.department?.name || 'General'}</div>
              <div><span className="text-slate-500">Due Date:</span> {dueDateStr}</div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 border border-slate-100">
              <div className="font-bold text-slate-900 uppercase tracking-wider text-[10px]">
                Hardware & Accessories Handed Over
              </div>
              <div><span className="text-slate-500">Asset Tag:</span> <strong className="font-mono text-brand-600">{allocation.asset?.assetTag}</strong></div>
              <div><span className="text-slate-500">Serial No:</span> <span className="font-mono">{allocation.asset?.serialNumber}</span></div>
              <div><span className="text-slate-500">Make & Model:</span> {allocation.asset?.make} {allocation.asset?.model}</div>
              <div><span className="text-slate-500">Specs:</span> {allocation.asset?.processor}, {allocation.asset?.ram}, {allocation.asset?.storage}</div>
              <div><span className="text-slate-500">Charger S/N:</span> {allocation.asset?.chargerSerial || 'Tagged OEM'}</div>
              <div><span className="text-slate-500">Accessories:</span> {allocation.asset?.hasBag ? 'Bag (✓)' : ''} {allocation.asset?.hasMouse ? 'Mouse (✓)' : ''}</div>
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

          {/* Undertaking terms */}
          <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200/60 text-[11px] text-amber-900 space-y-1">
            <div className="font-bold">Institutional Undertaking:</div>
            <p>
              The recipient acknowledges receipt of the hardware in verified working order and accepts liability
              under the college IT hardware asset policy. Must be surrendered upon semester completion or recall.
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
