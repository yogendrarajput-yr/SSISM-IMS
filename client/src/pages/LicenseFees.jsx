import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Badge } from '../components/common/Badge';
import { StatCard } from '../components/common/StatCard';
import { Pagination } from '../components/common/Pagination';
import { ColumnVisibilitySelector } from '../components/common/ColumnVisibilitySelector';
import { Modal } from '../components/common/Modal';
import { CustomSelect } from '../components/common/CustomSelect';
import { useAuth } from '../context/AuthContext';
import { useDebounce } from '../hooks/useDebounce';
import {
  Receipt,
  Search,
  CheckCircle,
  AlertTriangle,
  CreditCard,
  Plus,
  Trash2,
} from 'lucide-react';

const FEE_COLUMNS = [
  { key: 'student', label: 'Student', required: true },
  { key: 'deptBatch', label: 'Department / Batch' },
  { key: 'academicYear', label: 'Academic Year' },
  { key: 'amount', label: 'Fee Amount' },
  { key: 'status', label: 'Clearance Status' },
  { key: 'receiptDate', label: 'Receipt / Payment Date' },
  { key: 'actions', label: 'Actions', required: true },
];

export const LicenseFees = () => {
  const [records, setRecords] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [summary, setSummary] = useState([]);

  const [visibleColumns, setVisibleColumns] = useState(() => {
    try {
      const saved = localStorage.getItem('col_pref_fees');
      return saved ? JSON.parse(saved) : FEE_COLUMNS.map((c) => c.key);
    } catch {
      return FEE_COLUMNS.map((c) => c.key);
    }
  });

  // Update modal
  const [editRecord, setEditRecord] = useState(null);
  const [newStatus, setNewStatus] = useState('PAID');
  const [newAmount, setNewAmount] = useState('1500');
  const [receiptNo, setReceiptNo] = useState('');
  const [notes, setNotes] = useState('');
  const [updating, setUpdating] = useState(false);

  const debouncedSearch = useDebounce(search, 300);
  const { isStaff } = useAuth();

  const fetchFees = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.append('search', debouncedSearch);
      if (status) params.append('status', status);
      if (departmentId) params.append('departmentId', departmentId);
      if (academicYear) params.append('academicYear', academicYear);
      params.append('page', page);
      params.append('limit', limit);

      const res = await api.get(`/fees?${params.toString()}`);
      setRecords(res.data.data.records);
      setPagination(res.data.data.pagination);
      setSummary(res.data.data.summary || []);
    } catch (err) {
      console.error('Failed to load license fee records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    api.get('/departments').then((res) => {
      setDepartments(res.data.data.departments || []);
    });
  }, []);

  useEffect(() => {
    fetchFees();
  }, [debouncedSearch, status, departmentId, academicYear, page, limit]);

  const handleOpenEdit = (rec) => {
    setEditRecord(rec);
    setNewStatus(rec.status);
    setNewAmount(rec.amount || '1500');
    setReceiptNo(rec.receiptNo || `REC-2025-${Math.floor(1000 + Math.random() * 9000)}`);
    setNotes(rec.notes || '');
  };

  const handleSaveStatus = async (e) => {
    e.preventDefault();
    if (!editRecord) return;
    setUpdating(true);

    try {
      await api.put(`/fees/${editRecord.id}`, {
        status: newStatus,
        amount: Number(newAmount) || Number(editRecord.amount),
        receiptNo: newStatus === 'PAID' ? receiptNo : null,
        paymentDate: newStatus === 'PAID' ? new Date().toISOString() : null,
        notes: notes || null,
      });

      setEditRecord(null);
      fetchFees();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update fee record.');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteFee = async (rec) => {
    if (
      !window.confirm(
        `Are you sure you want to permanently delete the fee record for ${rec.student?.name || 'student'} (${rec.academicYear})?`
      )
    ) {
      return;
    }
    try {
      await api.delete(`/fees/${rec.id}`);
      fetchFees();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete fee record');
    }
  };

  const paidSummary = summary.find((s) => s.status === 'PAID');
  const unpaidSummary = summary.find((s) => s.status === 'UNPAID');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Software License & Maintenance Fee Tracker
          </h1>
        </div>

        <ColumnVisibilitySelector
          columns={FEE_COLUMNS}
          visibleColumns={visibleColumns}
          onChange={setVisibleColumns}
          storageKey="col_pref_fees"
        />
      </div>

      {/* Summary Cards (Unified Master StatCard Design) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Total Cleared (PAID)"
          value={`₹${(paidSummary?._sum?.amount || 0).toLocaleString('en-IN')}`}
          icon={CheckCircle}
          color="green"
          active={status === 'PAID'}
          onClick={() => {
            setStatus('PAID');
            setPage(1);
          }}
        />

        <StatCard
          title="Total Outstanding (UNPAID)"
          value={`₹${(unpaidSummary?._sum?.amount || 0).toLocaleString('en-IN')}`}
          icon={AlertTriangle}
          color="red"
          active={status === 'UNPAID'}
          onClick={() => {
            setStatus('UNPAID');
            setPage(1);
          }}
        />

        <StatCard
          title="Total Enrolled"
          value={pagination.total}
          icon={CreditCard}
          color="blue"
          active={status === ''}
          onClick={() => {
            setStatus('');
            setPage(1);
          }}
        />
      </div>

      {/* Filters */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search student by name, roll number, or email..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-[#F26522] focus:ring-2 focus:ring-orange-500/20 outline-none"
          />
        </div>

        <CustomSelect
          value={status}
          onChange={(val) => {
            setStatus(val);
            setPage(1);
          }}
          placeholder="All Fee Statuses"
          options={[
            { value: '', label: 'All Fee Statuses' },
            { value: 'PAID', label: 'PAID (Cleared)' },
            { value: 'UNPAID', label: 'UNPAID (Action Needed)' },
            { value: 'PARTIAL', label: 'PARTIAL' },
            { value: 'EXEMPTED', label: 'EXEMPTED' },
          ]}
          className="w-full sm:w-52"
        />

        <CustomSelect
          value={departmentId}
          onChange={(val) => {
            setDepartmentId(val);
            setPage(1);
          }}
          placeholder="All Depts"
          options={[
            { value: '', label: 'All Depts' },
            ...departments.map((d) => ({
              value: d.id,
              label: d.code,
            })),
          ]}
          className="w-full sm:w-44"
        />
      </div>

      {/* Fee Table: Pure white rounded-xl container */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            <div className="w-8 h-8 border-3 border-orange-200 border-t-[#F26522] rounded-full animate-spin mx-auto mb-2" />
            Loading fee registry...
          </div>
        ) : records.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No student license fee records matched your filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10.5px] font-bold uppercase tracking-wider text-slate-500">
                  {visibleColumns.includes('student') && <th className="py-2.5 px-3">Student</th>}
                  {visibleColumns.includes('deptBatch') && <th className="py-2.5 px-3">Department / Batch</th>}
                  {visibleColumns.includes('academicYear') && <th className="py-2.5 px-3">Academic Year</th>}
                  {visibleColumns.includes('amount') && <th className="py-2.5 px-3">Fee Amount</th>}
                  {visibleColumns.includes('status') && <th className="py-2.5 px-3">Clearance Status</th>}
                  {visibleColumns.includes('receiptDate') && <th className="py-2.5 px-3">Receipt / Payment Date</th>}
                  {visibleColumns.includes('actions') && (
                    <th className="py-2.5 px-3 text-right whitespace-nowrap">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {records.map((rec) => {
                  const isUnpaid = rec.status === 'UNPAID';
                  return (
                    <tr
                      key={rec.id}
                      className={`hover:bg-orange-50/20 transition-colors ${
                        isUnpaid ? 'bg-rose-50/20' : ''
                      }`}
                    >
                      {/* Student */}
                      {visibleColumns.includes('student') && (
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <div className="font-bold text-slate-800">{rec.student.name}</div>
                          <div className="font-mono text-[10px] text-slate-400">
                            {rec.student.rollNumberOrEmpId}
                          </div>
                        </td>
                      )}

                      {/* Department */}
                      {visibleColumns.includes('deptBatch') && (
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <div className="font-semibold text-slate-700">
                            {rec.student.department?.code || 'General'}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Batch: {rec.student.batchYear || 'N/A'}
                          </div>
                        </td>
                      )}

                      {/* Academic Year */}
                      {visibleColumns.includes('academicYear') && (
                        <td className="py-2.5 px-3 font-mono text-slate-600 whitespace-nowrap">
                          {rec.academicYear} ({rec.semester || 'Annual'})
                        </td>
                      )}

                      {/* Amount */}
                      {visibleColumns.includes('amount') && (
                        <td className="py-2.5 px-3 font-bold text-slate-800 whitespace-nowrap">
                          ₹{parseFloat(rec.amount).toLocaleString('en-IN')}
                        </td>
                      )}

                      {/* Status */}
                      {visibleColumns.includes('status') && (
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <Badge status={rec.status} size="xs" />
                        </td>
                      )}

                      {/* Receipt & Payment Date */}
                      {visibleColumns.includes('receiptDate') && (
                        <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                          {rec.receiptNo ? (
                            <div>
                              <span className="font-mono text-[11px] font-bold text-slate-700 block">
                                {rec.receiptNo}
                              </span>
                              <span className="text-[10px] text-slate-600">
                                {rec.paymentDate ? new Date(rec.paymentDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Pending Payment</span>
                          )}
                        </td>
                      )}

                      {/* Actions */}
                      {visibleColumns.includes('actions') && (
                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end space-x-1.5 flex-nowrap">
                            {isStaff && (
                              <button
                                onClick={() => handleOpenEdit(rec)}
                                className="px-2.5 py-1 text-[11px] font-bold text-white bg-[#F26522] hover:bg-orange-600 rounded-lg shadow-2xs transition"
                              >
                                + Log Payment
                              </button>
                            )}
                            {isStaff && (
                              <button
                                onClick={() => handleDeleteFee(rec)}
                                title="Permanently Delete Fee Record"
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Universal Pagination Toolbar with Limit Selector */}
        <Pagination
          page={page}
          totalPages={pagination.totalPages}
          total={pagination.total}
          limit={limit}
          onPageChange={setPage}
          onLimitChange={(newLimit) => {
            setLimit(newLimit);
            setPage(1);
          }}
          itemName="fee records"
        />
      </div>

      {/* Update Fee Modal */}
      <Modal isOpen={!!editRecord} onClose={() => setEditRecord(null)} title="Log Student License Fee Payment" maxWidth="max-w-md">
        <form onSubmit={handleSaveStatus} className="space-y-3.5 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <div>
              <span className="text-slate-400 font-bold uppercase text-[10px]">Student: </span>
              <strong>{editRecord?.student?.name}</strong> ({editRecord?.student?.rollNumberOrEmpId})
            </div>
            <div>
              <span className="text-slate-400 font-bold uppercase text-[10px]">Academic Year: </span>
              <strong>{editRecord?.academicYear}</strong>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 uppercase mb-1 text-[10.5px]">
              Maintenance Fee Amount (₹ 1500 - 2000 Manual) *
            </label>
            <input
              type="number"
              value={newAmount}
              onChange={(e) => setNewAmount(e.target.value)}
              placeholder="e.g. 1500 or 2000"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-[#F26522] font-bold text-slate-800"
            />
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              Flexible manual fee: ₹1500 - ₹2000 (Applicable only to students)
            </span>
          </div>

          <div>
            <label className="block font-bold text-slate-700 uppercase mb-1 text-[10.5px]">Clearance Status *</label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-[#F26522] bg-white"
            >
              <option value="PAID">PAID (Clear for Laptop Allocation)</option>
              <option value="UNPAID">UNPAID (Trigger Warning Alert)</option>
              <option value="PARTIAL">PARTIAL (Installment Pending)</option>
              <option value="EXEMPTED">EXEMPTED (Scholarship / Staff Waiver)</option>
            </select>
          </div>

          {newStatus === 'PAID' && (
            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1 text-[10.5px]">Receipt Number</label>
              <input
                type="text"
                value={receiptNo}
                onChange={(e) => setReceiptNo(e.target.value)}
                placeholder="e.g. REC-2025-9481"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-[#F26522] font-mono"
              />
            </div>
          )}

          <div>
            <label className="block font-bold text-slate-700 uppercase mb-1 text-[10.5px]">Accounting Remarks</label>
            <textarea
              rows="2"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Fee deposited at campus accounts desk..."
              className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-[#F26522]"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2.5 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setEditRecord(null)}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updating}
              className="px-4 py-2 rounded-xl bg-[#F26522] hover:bg-orange-600 text-white font-bold shadow-md shadow-orange-500/20"
            >
              {updating ? 'Saving...' : 'Save Clearance'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
