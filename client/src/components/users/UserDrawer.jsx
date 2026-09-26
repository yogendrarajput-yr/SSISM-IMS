import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { Badge } from '../common/Badge';
import {
  X,
  User,
  GraduationCap,
  Building,
  Phone,
  Mail,
  MapPin,
  Laptop,
  Receipt,
  History,
  AlertTriangle,
  Archive,
  Edit2,
  Calendar,
  CreditCard,
  CheckCircle,
  Clock,
} from 'lucide-react';

/**
 * UserDrawer Component
 * 
 * Slide-over drawer component that opens upon clicking any row in the Student or Staff table.
 * Displays comprehensive user profile, father's name, unique Aadhaar, branch/track,
 * hardware custody status, annual software license fee clearance, and allocation ledger.
 */
export const UserDrawer = ({
  isOpen,
  onClose,
  userId,
  initialUser,
  onEdit,
  onArchive,
}) => {
  const [user, setUser] = useState(initialUser || null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');

  // Fetch complete relational details
  useEffect(() => {
    const fetchUserDetails = async () => {
      if (!userId) return;
      setLoading(true);
      try {
        const res = await api.get(`/users/${userId}`);
        setUser(res.data.data.user);
      } catch (err) {
        console.error('Failed to load user details:', err);
      } finally {
        setLoading(false);
      }
    };

    if (isOpen && userId) {
      fetchUserDetails();
    } else if (initialUser) {
      setUser(initialUser);
    }
  }, [isOpen, userId, initialUser]);

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

  if (!isOpen) return null;

  const isStudent = user?.role === 'STUDENT';
  const activeAlloc = user?.receivedAllocations?.find((a) => a.status === 'ACTIVE') || user?.activeAllocation;
  const isHoldingLaptop = Boolean(activeAlloc);

  // Avatar initials
  const initials = user?.name
    ? user.name
        .split(' ')
        .filter((n) => !n.startsWith('('))
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'U';

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
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#F26522] to-orange-400 flex items-center justify-center text-white font-extrabold text-base shadow-md shadow-orange-500/20">
              {initials}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-black text-slate-900 tracking-tight">
                  {user?.name || 'Loading user...'}
                </h2>
                <Badge variant={isStudent ? 'info' : 'purple'} size="xs">
                  {user?.role || 'USER'}
                </Badge>
              </div>
              <div className="flex items-center space-x-2 mt-0.5 text-xs text-slate-500 font-mono">
                <span>{user?.rollNumberOrEmpId}</span>
                <span>•</span>
                <span>{user?.department?.code || user?.branch || 'Campus'}</span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition"
            aria-label="Close drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 px-5 bg-white space-x-4">
          <button
            onClick={() => setActiveTab('profile')}
            className={`py-3 text-xs font-bold border-b-2 flex items-center space-x-1.5 transition ${
              activeTab === 'profile'
                ? 'border-[#F26522] text-[#F26522]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Profile Details</span>
          </button>

          <button
            onClick={() => setActiveTab('custody')}
            className={`py-3 text-xs font-bold border-b-2 flex items-center space-x-1.5 transition ${
              activeTab === 'custody'
                ? 'border-[#F26522] text-[#F26522]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Laptop className="w-3.5 h-3.5" />
            <span>Hardware Custody</span>
            {isHoldingLaptop && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse ml-0.5" />
            )}
          </button>

          {isStudent && (
            <button
              onClick={() => setActiveTab('fees')}
              className={`py-3 text-xs font-bold border-b-2 flex items-center space-x-1.5 transition ${
                activeTab === 'fees'
                  ? 'border-[#F26522] text-[#F26522]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>License Fees</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('history')}
            className={`py-3 text-xs font-bold border-b-2 flex items-center space-x-1.5 transition ${
              activeTab === 'history'
                ? 'border-[#F26522] text-[#F26522]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Allocation Ledger</span>
          </button>
        </div>

        {/* Drawer Body Scroll Area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {loading && !user ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 border-3 border-[#F26522] border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-bold text-slate-400">Loading user profile...</p>
            </div>
          ) : (
            <>
              {/* TAB 1: Profile & Identity */}
              {activeTab === 'profile' && (
                <div className="space-y-4">
                  {/* Status Banner */}
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div
                        className={`w-2.5 h-2.5 rounded-full ${
                          user?.isArchived ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                      />
                      <span className="text-xs font-bold text-slate-700">
                        {user?.isArchived ? 'Archived Record' : 'Active Campus Member'}
                      </span>
                    </div>
                    {isHoldingLaptop ? (
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 flex items-center space-x-1">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Holding Laptop ({activeAlloc.asset?.assetTag})</span>
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                        No Laptop Issued
                      </span>
                    )}
                  </div>

                  {/* Personal and Academic Info Grid */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3.5 shadow-xs">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">
                      Identity & Demographics
                    </h3>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">
                          Full Name
                        </span>
                        <span className="font-bold text-slate-800">{user?.name}</span>
                      </div>

                      {isStudent && (
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">
                            Father's Name
                          </span>
                          <span className="font-bold text-slate-800">
                            {user?.fatherName || 'Not Provided'}
                          </span>
                        </div>
                      )}

                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">
                          {isStudent ? 'Roll Number' : 'Employee ID'}
                        </span>
                        <span className="font-mono font-bold text-[#F26522]">
                          {user?.rollNumberOrEmpId}
                        </span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">
                          Aadhaar Number
                        </span>
                        <span className="font-mono font-bold text-slate-700">
                          {user?.aadhaarNumber || 'Not Linked'}
                        </span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">
                          {isStudent ? 'Class / Branch' : 'Department'}
                        </span>
                        <span className="font-bold text-slate-800">
                          {user?.branch || user?.department?.code || 'N/A'}
                        </span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">
                          {isStudent ? 'Batch / Year' : 'Current Role / Designation'}
                        </span>
                        <span className="font-bold text-slate-800">
                          {isStudent ? user?.batchYear || 'N/A' : user?.designation || user?.role}
                        </span>
                      </div>

                      {isStudent && (
                        <div className="col-span-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">
                            Curriculum Track
                          </span>
                          <span className="font-bold text-slate-800">
                            {user?.track || 'General Curriculum'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Contact & Residential Details */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-xs">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">
                      Contact & Communication
                    </h3>
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center space-x-2.5 p-2 rounded-xl hover:bg-slate-50 text-slate-700">
                        <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="font-medium truncate">{user?.email}</span>
                      </div>
                      <div className="flex items-center space-x-2.5 p-2 rounded-xl hover:bg-slate-50 text-slate-700">
                        <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="font-medium">{user?.phone || 'No phone registered'}</span>
                      </div>
                      <div className="flex items-start space-x-2.5 p-2 rounded-xl hover:bg-slate-50 text-slate-700">
                        <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                        <span className="font-medium text-slate-600">
                          {user?.address || 'Campus / Sandalpur, Madhya Pradesh'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: Hardware Custody */}
              {activeTab === 'custody' && (
                <div className="space-y-4">
                  {isHoldingLaptop ? (
                    <div className="bg-orange-50/50 border border-orange-200 rounded-2xl p-4 space-y-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[10px] font-black uppercase text-orange-600 tracking-wider">
                            Active Custody Asset
                          </span>
                          <h4 className="text-base font-black text-slate-900 font-mono mt-0.5">
                            {activeAlloc.asset?.assetTag}
                          </h4>
                          <p className="text-xs text-slate-600 font-medium">
                            {activeAlloc.asset?.make} {activeAlloc.asset?.model}
                          </p>
                        </div>
                        <Badge variant="success" size="sm">
                          ISSUED / ACTIVE
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5 text-xs pt-2 border-t border-orange-100">
                        <div className="bg-white p-2.5 rounded-xl border border-orange-100">
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">
                            Serial Number
                          </span>
                          <span className="font-mono font-bold text-slate-800">
                            {activeAlloc.asset?.serialNumber}
                          </span>
                        </div>

                        <div className="bg-white p-2.5 rounded-xl border border-orange-100">
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">
                            Condition at Handover
                          </span>
                          <span className="font-bold text-slate-800">
                            {activeAlloc.issueCondition || activeAlloc.asset?.condition}
                          </span>
                        </div>

                        <div className="bg-white p-2.5 rounded-xl border border-orange-100">
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">
                            Issue Handover Date
                          </span>
                          <span className="font-bold text-slate-800">
                            {activeAlloc.issuedAt ? new Date(activeAlloc.issuedAt).toLocaleDateString() : 'N/A'}
                          </span>
                        </div>

                        <div className="bg-white p-2.5 rounded-xl border border-orange-100">
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">
                            Return Due Date
                          </span>
                          <span className="font-bold text-slate-800">
                            {activeAlloc.dueDate ? new Date(activeAlloc.dueDate).toLocaleDateString() : 'End of Term'}
                          </span>
                        </div>

                        <div className="col-span-2 bg-white p-2.5 rounded-xl border border-orange-100">
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">
                            Charger Serial
                          </span>
                          <span className="font-mono font-medium text-slate-700">
                            {activeAlloc.asset?.chargerSerial || 'Standard Tagged Adapter'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl space-y-2">
                      <Laptop className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="text-xs font-bold text-slate-700">No Active Laptop Custody</p>
                      <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                        This user does not currently hold any institutional laptop. Assets can be allocated from the Issue / Return module.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: Software License Fees */}
              {activeTab === 'fees' && isStudent && (
                <div className="space-y-4">
                  {user?.licenseFeeRecords && user.licenseFeeRecords.length > 0 ? (
                    user.licenseFeeRecords.map((fee) => (
                      <div
                        key={fee.id}
                        className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-xs"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-xs font-extrabold text-slate-900">
                              {fee.academicYear} • {fee.semester || 'Semester 4'}
                            </span>
                            <p className="text-[11px] text-slate-400">Software License Clearance</p>
                          </div>
                          <Badge
                            variant={
                              fee.status === 'PAID'
                                ? 'success'
                                : fee.status === 'UNPAID'
                                ? 'danger'
                                : fee.status === 'PARTIAL'
                                ? 'warning'
                                : 'neutral'
                            }
                            size="sm"
                          >
                            {fee.status}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100">
                          <div>
                            <span className="text-[10px] text-slate-400 uppercase font-bold">Amount</span>
                            <p className="font-black text-slate-900 font-mono">₹{Number(fee.amount).toLocaleString()}</p>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 uppercase font-bold">Receipt No</span>
                            <p className="font-mono text-slate-700">{fee.receiptNo || 'Pending'}</p>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 uppercase font-bold">Payment Date</span>
                            <p className="text-slate-700">
                              {fee.paymentDate ? new Date(fee.paymentDate).toLocaleDateString() : 'Unpaid'}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                      <Receipt className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs font-bold text-slate-600">No License Fee Records Found</p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: Allocation History */}
              {activeTab === 'history' && (
                <div className="space-y-3">
                  {user?.receivedAllocations && user.receivedAllocations.length > 0 ? (
                    user.receivedAllocations.map((alloc) => (
                      <div
                        key={alloc.id}
                        className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-slate-900">
                            {alloc.asset?.assetTag} ({alloc.asset?.model})
                          </span>
                          <Badge
                            variant={alloc.status === 'ACTIVE' ? 'success' : 'neutral'}
                            size="xs"
                          >
                            {alloc.status}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500">
                          <div>
                            <span className="font-bold text-slate-400">Issued:</span>{' '}
                            {alloc.issuedAt ? new Date(alloc.issuedAt).toLocaleDateString() : ''}
                          </div>
                          <div>
                            <span className="font-bold text-slate-400">Returned:</span>{' '}
                            {alloc.returnedAt ? new Date(alloc.returnedAt).toLocaleDateString() : 'Active'}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                      <History className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs font-bold text-slate-600">No Allocation History</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Drawer Action Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            {onEdit && (
              <button
                onClick={() => {
                  onClose();
                  onEdit(user);
                }}
                className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs flex items-center space-x-1.5 transition shadow-xs"
              >
                <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                <span>Edit Profile</span>
              </button>
            )}

            {onArchive && (
              <button
                onClick={() => onArchive(user)}
                title={
                  isHoldingLaptop
                    ? 'Active Constraint Lock: Cannot archive user holding active laptop'
                    : 'Archive user'
                }
                className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center space-x-1.5 transition border ${
                  isHoldingLaptop
                    ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-red-50 hover:bg-red-100 border-red-200 text-red-700 shadow-xs'
                }`}
              >
                <Archive className="w-3.5 h-3.5" />
                <span>Archive</span>
              </button>
            )}
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs transition"
          >
            Close
          </button>
        </div>
      </div>
    </>
  );
};
