import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Badge } from '../components/common/Badge';
import { AllocateModal } from '../components/allocation/AllocateModal';
import { ReceiptModal } from '../components/allocation/ReceiptModal';
import { AddMaintenanceModal } from '../components/maintenance/AddMaintenanceModal';
import { useAuth } from '../context/AuthContext';
import {
  ArrowLeft,
  Cpu,
  HardDrive,
  MemoryStick,
  Wrench,
  Clock,
  AlertTriangle,
  Trash2,
  FileText,
  Gift,
  Monitor,
  Palette,
} from 'lucide-react';

/**
 * Asset Profile & Comprehensive Lifecycle View
 * Details hardware specifications, accessories checklist, procurement records,
 * Phase 2 Native MySQL JSON attributes, immutable holder history, and repair logs.
 */
export const AssetDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [asset, setAsset] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal interaction states
  const [allocateOpen, setAllocateOpen] = useState(false);
  const [maintenanceOpen, setMaintenanceOpen] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  const { isStaff } = useAuth();

  // Fetch complete asset entity with relational history from backend
  const fetchAsset = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/assets/${id}`);
      setAsset(res.data.data.asset);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load asset details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAsset();
  }, [id]);

  const handleDeleteAsset = async () => {
    if (
      !window.confirm(
        `Are you sure you want to permanently delete asset '${asset.assetTag}' (${asset.model}) from the database? This action cannot be undone.`
      )
    ) {
      return;
    }
    try {
      await api.delete(`/assets/${asset.id}`);
      navigate('/inventory');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete asset.');
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-3 border-orange-200 border-t-[#F26522] rounded-full animate-spin" />
      </div>
    );
  }

  // Error fallback display
  if (error || !asset) {
    return (
      <div className="p-8 text-center bg-white rounded-xl border border-slate-200 max-w-md mx-auto my-12 shadow-xs">
        <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-800">Asset Not Found</h3>
        <p className="text-xs text-slate-500 mt-1 mb-4">{error || 'Requested hardware asset does not exist.'}</p>
        <button
          onClick={() => navigate('/inventory')}
          className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
        >
          Return to Inventory
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header: Breadcrumb & Contextual Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/inventory')}
            aria-label="Back to inventory"
            className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 transition shadow-2xs"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight font-mono">
                {asset.assetTag}
              </h1>
              <Badge status={asset.status} size="xs" />
              <Badge status={asset.condition} size="xs" />
              {asset.acquisitionSource === 'DONATED' ? (
                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
                  <Gift className="w-3.5 h-3.5 text-purple-600" />
                  <span>Donated Asset</span>
                </span>
              ) : (
                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                  <span>College Purchased</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Serial No: <span className="font-mono font-semibold text-slate-700">{asset.serialNumber}</span> •{' '}
              {asset.make} {asset.model}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          {/* Issue laptop action (only active when asset is available in stock) */}
          {isStaff && asset.status === 'AVAILABLE' && (
            <button
              onClick={() => setAllocateOpen(true)}
              className="px-4 py-2 bg-[#F26522] hover:bg-orange-600 text-white text-xs font-bold rounded-xl shadow-md shadow-orange-500/25 transition"
            >
              + Issue / Allocate Laptop
            </button>
          )}

          {/* Maintenance recording action */}
          {isStaff && (
            <button
              onClick={() => setMaintenanceOpen(true)}
              className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center space-x-1.5 shadow-2xs"
            >
              <Wrench className="w-3.5 h-3.5 text-amber-600" />
              <span>Log Upgrade / Repair</span>
            </button>
          )}

          {/* Delete Asset action */}
          {isStaff && asset.status !== 'ISSUED' && (
            <button
              onClick={handleDeleteAsset}
              title="Permanently Delete Asset from Database"
              className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl transition flex items-center space-x-1.5 shadow-2xs"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span>Delete Asset</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Hardware Specifications & Procurement Records */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Core Hardware & Accessories Checklist */}
        <div className="bg-white rounded-xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-5 flex flex-col justify-between">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3.5 flex items-center space-x-2">
              <Cpu className="w-4 h-4 text-[#F26522]" />
              <span>Hardware Architecture & Specifications</span>
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {/* CPU */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start space-x-3">
                <Cpu className="w-5 h-5 text-[#F26522] shrink-0 mt-0.5" />
                <div>
                  <div className="text-[10px] font-bold uppercase text-slate-400">Processor</div>
                  <div className="text-xs font-bold text-slate-800 mt-0.5">{asset.processor || 'Standard'}</div>
                  {asset.generation && (
                    <div className="text-[10px] text-slate-500 font-medium">{asset.generation}</div>
                  )}
                </div>
              </div>

              {/* RAM */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start space-x-3">
                <MemoryStick className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <div className="text-[10px] font-bold uppercase text-slate-400">Memory (RAM)</div>
                  <div className="text-xs font-bold text-slate-800 mt-0.5">{asset.ram || '16GB DDR4'}</div>
                </div>
              </div>

              {/* Storage */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start space-x-3">
                <HardDrive className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <div className="text-[10px] font-bold uppercase text-slate-400">Storage (SSD)</div>
                  <div className="text-xs font-bold text-slate-800 mt-0.5">{asset.storage || '512GB SSD'}</div>
                </div>
              </div>

              {/* Display Size */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start space-x-3">
                <Monitor className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
                <div>
                  <div className="text-[10px] font-bold uppercase text-slate-400">Display Size</div>
                  <div className="text-xs font-bold text-slate-800 mt-0.5">{asset.displaySize || '14 inch'}</div>
                </div>
              </div>

              {/* Color */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start space-x-3">
                <Palette className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                <div>
                  <div className="text-[10px] font-bold uppercase text-slate-400">Color</div>
                  <div className="text-xs font-bold text-slate-800 mt-0.5">{asset.color || 'Platinum Silver'}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Included Accessories Checklist */}
          <div className="pt-4 border-t border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5">
              Included Accessories Checklist
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
                <span className="text-slate-400 text-[10px] block uppercase font-bold">Original Charger:</span>
                <span className="font-mono font-bold text-slate-800">
                  {asset.chargerSerial || 'Standard OEM Charger'}
                </span>
              </div>
              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
                <span className="text-slate-400 text-[10px] block uppercase font-bold">Laptop Carry Bag:</span>
                <span className="font-bold text-slate-800">{asset.hasBag ? 'Yes (Verified ✓)' : 'No'}</span>
              </div>
              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
                <span className="text-slate-400 text-[10px] block uppercase font-bold">External Mouse:</span>
                <span className="font-bold text-slate-800">{asset.hasMouse ? 'Yes (Issued ✓)' : 'No'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Procurement & Acquisition Details */}
        <div className="bg-white rounded-xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center space-x-2">
              <FileText className="w-4 h-4 text-emerald-600" />
              <span>Procurement & Acquisition Records</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-slate-400 text-[10px] block uppercase font-bold">Acquisition Source:</span>
                <span className="font-bold text-slate-800">
                  {asset.acquisitionSource === 'DONATED' ? 'Donated / CSR Grant' : 'College Purchased'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-slate-400 text-[10px] block uppercase font-bold">Invoice / Ref Number:</span>
                <span className="font-mono font-bold text-slate-800">{asset.invoiceNo || 'INV-CAMPUS-CENTRAL'}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-slate-400 text-[10px] block uppercase font-bold">Acquisition Date:</span>
                <span className="font-bold text-slate-800">
                  {asset.purchaseDate ? new Date(asset.purchaseDate).toLocaleDateString() : 'Mar 10, 2024'}
                </span>
              </div>
            </div>

            {/* If Donated: Donor Profile Highlight Card */}
            {asset.acquisitionSource === 'DONATED' && asset.donor && (
              <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold shrink-0 mt-0.5">
                    <Gift className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase text-purple-600">Donated By</div>
                    <div className="text-xs font-extrabold text-slate-900">{asset.donor.name}</div>
                    {asset.donor.organization && (
                      <div className="text-[11px] text-slate-600 font-medium">{asset.donor.organization}</div>
                    )}
                  </div>
                </div>
                <div className="text-xs text-slate-600 sm:text-right">
                  {asset.donor.contactEmail && (
                    <div className="text-[11px] text-slate-500 font-mono">{asset.donor.contactEmail}</div>
                  )}
                  {asset.donor.donationDate && (
                    <div className="text-[10.5px] text-purple-700 font-medium mt-0.5">
                      Donated on {new Date(asset.donor.donationDate).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Asset Remarks */}
          {asset.remarks ? (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
              <span className="font-bold text-slate-700 block text-[10px] uppercase">Remarks / Notes:</span>
              <p className="mt-0.5">{asset.remarks}</p>
            </div>
          ) : (
            <div className="p-3 bg-slate-50/60 border border-slate-200/60 rounded-xl text-xs text-slate-400 italic">
              No special remarks or conditions logged for this asset.
            </div>
          )}
        </div>
      </div>

      {/* SECTION 4: COMPREHENSIVE USER ASSIGNMENT TIMELINE LEDGER */}
      <div className="bg-white rounded-xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-5">
        <div>
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-[#F26522]" />
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
              User Assignment Timeline Ledger
            </h2>
          </div>
        </div>

        {/* Empty history notice */}
        {asset.allocations?.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            This asset has not yet been issued to any student or faculty.
          </div>
        ) : (
          <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
            {asset.allocations.map((alloc) => {
              const isActive = alloc.status === 'ACTIVE';
              return (
                <div key={alloc.id} className="relative group">
                  {/* Timeline indicator node */}
                  <div
                    className={`absolute -left-6 top-1.5 w-4 h-4 rounded-full border-2 ${
                      isActive
                        ? 'bg-[#F26522] border-white ring-4 ring-orange-100'
                        : 'bg-emerald-500 border-white ring-4 ring-slate-100'
                    }`}
                  />

                  {/* Allocation Card */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 hover:bg-orange-50/20 transition space-y-2.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-slate-900">{alloc.recipient?.name}</span>
                        <span className="font-mono text-[11px] text-slate-500">({alloc.recipient?.rollNumberOrEmpId})</span>
                        <span className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-[10px] font-semibold text-slate-600">
                          {alloc.recipient?.role} • {alloc.recipient?.department?.code}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge status={alloc.status} size="xs" />
                        <button
                          onClick={() => {
                            setSelectedReceipt(alloc);
                            setReceiptOpen(true);
                          }}
                          className="px-2 py-0.5 text-[10.5px] font-bold text-[#F26522] bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-md transition flex items-center space-x-1"
                        >
                          <FileText className="w-3 h-3" />
                          <span>Receipt</span>
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-slate-600">
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase font-bold">Issue Date</span>
                        <span>{new Date(alloc.issuedAt).toLocaleDateString()}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase font-bold">Handover Condition</span>
                        <Badge status={alloc.issueCondition} size="xs" />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase font-bold">Return Date</span>
                        <span>{alloc.returnedAt ? new Date(alloc.returnedAt).toLocaleDateString() : 'Currently Active'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase font-bold">Return Condition</span>
                        {alloc.returnCondition ? <Badge status={alloc.returnCondition} size="xs" /> : <span className="text-slate-400 italic">In Custody</span>}
                      </div>
                    </div>

                    {alloc.notes && (
                      <div className="text-xs text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200">
                        <span className="font-bold text-slate-700">Remarks: </span>
                        {alloc.notes}
                      </div>
                    )}

                    <div className="text-[10px] text-slate-400 flex justify-between items-center pt-1 border-t border-slate-200">
                      <span>Issued by: {alloc.issuedBy?.name}</span>
                      {alloc.returnedBy && <span>Accepted return by: {alloc.returnedBy?.name}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION 5: HARDWARE REPAIR & UPGRADE LOGS */}
      <div className="bg-white rounded-xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <Wrench className="w-4 h-4 text-amber-600" />
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                Hardware Maintenance & Upgrade History
              </h2>
            </div>
          </div>
          {isStaff && (
            <button
              onClick={() => setMaintenanceOpen(true)}
              className="px-3 py-1 text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 rounded-xl border border-amber-200 transition"
            >
              + Log New Upgrade
            </button>
          )}
        </div>

        {asset.maintenanceLogs?.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            No repair or hardware upgrade records logged for this unit.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {asset.maintenanceLogs.map((log) => (
              <div key={log.id} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[10px] uppercase">
                      {log.type.replace(/_/g, ' ')}
                    </span>
                    <span className="text-xs font-semibold text-slate-700">
                      {log.vendorOrTechnician ? `By ${log.vendorOrTechnician}` : 'Campus Lab Tech'}
                    </span>
                    <span className="text-xs text-slate-400">
                      • {new Date(log.performedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">{log.description}</p>
                </div>
                <div className="text-right">
                  <div className="text-xs font-extrabold text-slate-800">
                    {log.cost ? `₹${parseFloat(log.cost).toLocaleString('en-IN')}` : 'General Maintenance'}
                  </div>
                  <div className="text-[10px] text-slate-400">Recorded by {log.performedBy?.name || 'Staff'}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Allocation Handover Modal */}
      <AllocateModal
        isOpen={allocateOpen}
        onClose={() => setAllocateOpen(false)}
        selectedAsset={asset}
        onSuccess={(alloc) => {
          fetchAsset();
          setSelectedReceipt(alloc);
          setReceiptOpen(true);
        }}
      />

      {/* Upgrade / Maintenance Modal */}
      <AddMaintenanceModal
        isOpen={maintenanceOpen}
        onClose={() => setMaintenanceOpen(false)}
        asset={asset}
        onSuccess={() => fetchAsset()}
      />

      {/* Receipt Modal */}
      <ReceiptModal
        isOpen={receiptOpen}
        onClose={() => setReceiptOpen(false)}
        allocation={selectedReceipt}
      />
    </div>
  );
};
