import React, { useEffect } from 'react';
import { Badge } from '../common/Badge';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  X,
  Cpu,
  MemoryStick,
  HardDrive,
  Monitor,
  Palette,
  ShieldCheck,
  Gift,
  Building,
  User,
  Clock,
  Wrench,
  ExternalLink,
  CheckCircle,
} from 'lucide-react';

/**
 * AssetDrawer Component
 * 
 * Slide-over drawer component that opens upon clicking any row in the Laptop Inventory table.
 * Displays granular hardware specifications, accessories checklist, donor details,
 * assignment timeline, and maintenance logs without navigating away from the table.
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Drawer open state
 * @param {Function} props.onClose - Dismiss drawer callback
 * @param {Object} props.asset - Asset data object
 * @param {Function} [props.onIssue] - Issue laptop callback
 * @param {Function} [props.onMaintenance] - Log maintenance callback
 */
export const AssetDrawer = ({
  isOpen,
  onClose,
  asset,
  onIssue,
  onMaintenance,
}) => {
  const navigate = useNavigate();
  const { isStaff } = useAuth();

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !asset) return null;

  const activeAlloc = asset.allocations?.find((a) => a.status === 'ACTIVE') || asset.allocations?.[0];

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-[65] transition-opacity duration-300 animate-in fade-in"
      />

      {/* Slide-Over Drawer Container */}
      <div className="fixed inset-y-0 right-0 z-[70] w-full max-w-xl bg-white shadow-2xl border-l border-slate-200 flex flex-col transform transition-transform duration-300 ease-out animate-in slide-in-from-right">
        {/* Drawer Header */}
        <div className="p-5 border-b border-slate-200 bg-slate-50/70 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-extrabold text-slate-900 font-mono tracking-tight">
                {asset.assetTag}
              </h2>
              <Badge status={asset.status} size="xs" />
              <Badge status={asset.condition} size="xs" />
              {asset.acquisitionSource === 'DONATED' ? (
                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                  <Gift className="w-3 h-3 text-purple-600" />
                  <span>Donated</span>
                </span>
              ) : (
                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                  <span>Purchased</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Serial No: <span className="font-mono font-bold text-slate-700">{asset.serialNumber}</span> •{' '}
              {asset.make} {asset.model}
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => navigate(`/inventory/${asset.id}`)}
              title="Open Full Profile Page"
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 transition"
            >
              <ExternalLink className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              title="Close Drawer"
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Action Bar inside Drawer */}
        {isStaff && (
          <div className="px-5 py-2.5 bg-white border-b border-slate-100 flex items-center justify-between">
            <div className="text-[11px] font-semibold text-slate-500">
              Department: <strong className="text-slate-800 font-mono">{asset.department?.code || 'Campus'}</strong>
            </div>
            <div className="flex items-center space-x-2">
              {asset.status === 'AVAILABLE' && (
                <button
                  onClick={() => {
                    onClose();
                    if (onIssue) onIssue(asset);
                  }}
                  className="px-3 py-1.5 bg-[#F26522] hover:bg-orange-600 text-white font-bold text-xs rounded-xl shadow-xs transition"
                >
                  + Issue Laptop
                </button>
              )}
              <button
                onClick={() => {
                  onClose();
                  if (onMaintenance) onMaintenance(asset);
                }}
                className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl transition flex items-center space-x-1"
              >
                <Wrench className="w-3.5 h-3.5 text-amber-600" />
                <span>Log Repair</span>
              </button>
            </div>
          </div>
        )}

        {/* Scrollable Content Body */}
        <div className="flex-1 p-5 space-y-6 overflow-y-auto">
          {/* SECTION 1: HARDWARE ARCHITECTURE */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
              <Cpu className="w-4 h-4 text-[#F26522]" />
              <span>Hardware Specifications</span>
            </h3>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Processor</span>
                <span className="text-xs font-bold text-slate-800">{asset.processor || 'Standard'}</span>
                {asset.generation && (
                  <span className="text-[10.5px] text-slate-500 block font-medium mt-0.5">{asset.generation}</span>
                )}
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Memory (RAM)</span>
                <span className="text-xs font-bold text-slate-800">{asset.ram || '16GB DDR4'}</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Storage (SSD/ROM)</span>
                <span className="text-xs font-bold text-slate-800">{asset.storage || '512GB SSD'}</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Display Size</span>
                <span className="text-xs font-bold text-slate-800">{asset.displaySize || '14 inch'}</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Color</span>
                <span className="text-xs font-bold text-slate-800">{asset.color || 'Platinum Silver'}</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Make & Model</span>
                <span className="text-xs font-bold text-slate-800">{asset.make} {asset.model}</span>
              </div>
            </div>
          </div>

          {/* SECTION 2: ACCESSORIES CHECKLIST */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Included Accessories</span>
            </h3>
            <div className="grid grid-cols-3 gap-2.5 text-xs">
              <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50">
                <span className="text-slate-400 text-[10px] block uppercase font-bold">Charger Serial:</span>
                <span className="font-mono font-bold text-slate-800 text-[11px]">
                  {asset.chargerSerial || 'OEM Charger'}
                </span>
              </div>
              <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50">
                <span className="text-slate-400 text-[10px] block uppercase font-bold">Carry Bag:</span>
                <span className="font-bold text-slate-800 text-[11px]">
                  {asset.hasBag ? 'Yes (Verified ✓)' : 'No'}
                </span>
              </div>
              <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50">
                <span className="text-slate-400 text-[10px] block uppercase font-bold">External Mouse:</span>
                <span className="font-bold text-slate-800 text-[11px]">
                  {asset.hasMouse ? 'Yes (Issued ✓)' : 'No'}
                </span>
              </div>
            </div>
          </div>

          {/* SECTION 3: CUSTODY & HOLDER STATUS */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
              <User className="w-4 h-4 text-blue-600" />
              <span>Current Custody Status</span>
            </h3>
            {activeAlloc ? (
              <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-xs">{activeAlloc.recipient?.name}</span>
                  <span className="px-2 py-0.5 rounded bg-white font-mono font-bold text-blue-700 text-[10px] border border-blue-200">
                    {activeAlloc.recipient?.department?.code || asset.department?.code}
                  </span>
                </div>
                <div className="text-xs text-slate-600">
                  Roll / Emp ID: <span className="font-mono font-bold text-slate-800">{activeAlloc.recipient?.rollNumberOrEmpId}</span> •{' '}
                  Role: <span className="font-semibold">{activeAlloc.recipient?.role}</span>
                </div>
                <div className="text-[11px] text-slate-500 pt-1 border-t border-blue-200/60">
                  Issued on: {new Date(activeAlloc.issuedAt).toLocaleDateString()}
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200 text-xs text-emerald-800 font-semibold flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>Currently in campus stock, ready for immediate issuance.</span>
              </div>
            )}
          </div>

          {/* SECTION 4: ACQUISITION & DONOR INFO */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
              <Gift className="w-4 h-4 text-purple-600" />
              <span>Acquisition Source & Donor</span>
            </h3>
            {asset.acquisitionSource === 'DONATED' && asset.donor ? (
              <div className="p-3.5 rounded-xl bg-purple-50/70 border border-purple-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-bold uppercase text-purple-600">Donated By</div>
                    <div className="text-xs font-extrabold text-slate-900">{asset.donor.name}</div>
                    {asset.donor.organization && (
                      <div className="text-[11px] text-slate-600 font-medium">{asset.donor.organization}</div>
                    )}
                  </div>
                  {asset.donor.donationDate && (
                    <div className="text-[10.5px] font-mono text-purple-700 bg-white px-2 py-1 rounded-md border border-purple-200">
                      {new Date(asset.donor.donationDate).toLocaleDateString()}
                    </div>
                  )}
                </div>
                {asset.donor.contactEmail && (
                  <div className="text-[11px] text-slate-500 font-mono">{asset.donor.contactEmail}</div>
                )}
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
                <span className="font-bold">Institutional Purchase:</span> Acquired under college IT infrastructure procurement budget.
              </div>
            )}

            {asset.remarks && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
                <span className="font-bold text-slate-700 block text-[10px] uppercase">Remarks / Notes:</span>
                <p className="mt-0.5">{asset.remarks}</p>
              </div>
            )}
          </div>

          {/* SECTION 5: ASSIGNMENT TIMELINE */}
          {asset.allocations?.length > 0 && (
            <div className="space-y-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                <Clock className="w-4 h-4 text-slate-600" />
                <span>Assignment Timeline Ledger</span>
              </h3>
              <div className="space-y-2 divide-y divide-slate-100 text-xs">
                {asset.allocations.slice(0, 3).map((alloc) => (
                  <div key={alloc.id} className="pt-2 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-800">{alloc.recipient?.name}</div>
                      <div className="text-[10.5px] text-slate-500 font-mono">
                        {alloc.recipient?.rollNumberOrEmpId} ({alloc.recipient?.role})
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge status={alloc.status} size="xs" />
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {new Date(alloc.issuedAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECTION 6: MAINTENANCE LOGS */}
          {asset.maintenanceLogs?.length > 0 && (
            <div className="space-y-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                <Wrench className="w-4 h-4 text-amber-600" />
                <span>Hardware Maintenance & Repairs</span>
              </h3>
              <div className="space-y-2 divide-y divide-slate-100 text-xs">
                {asset.maintenanceLogs.slice(0, 3).map((log) => (
                  <div key={log.id} className="pt-2 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-800">{log.type.replace(/_/g, ' ')}</div>
                      <div className="text-[10.5px] text-slate-500">{log.description}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-slate-800">
                        {log.cost ? `₹${parseFloat(log.cost).toLocaleString('en-IN')}` : 'General'}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {new Date(log.performedAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
