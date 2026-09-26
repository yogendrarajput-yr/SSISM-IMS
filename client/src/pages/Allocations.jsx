import React, { useState, useEffect } from 'react';
import { api, downloadFile } from '../services/api';
import { Badge } from '../components/common/Badge';
import { StatCard } from '../components/common/StatCard';
import { Pagination } from '../components/common/Pagination';
import { ColumnVisibilitySelector } from '../components/common/ColumnVisibilitySelector';
import { ReturnModal } from '../components/allocation/ReturnModal';
import { ReceiptModal } from '../components/allocation/ReceiptModal';
import { CustomSelect } from '../components/common/CustomSelect';
import { useAuth } from '../context/AuthContext';
import { useDebounce } from '../hooks/useDebounce';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Search,
  RotateCcw,
  FileText,
  Download,
  Printer,
  X,
  FileDown,
  Trash2,
  ArrowLeftRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Filter,
} from 'lucide-react';

const ALLOCATION_COLUMNS = [
  { key: 'asset', label: 'Laptop Asset', required: true },
  { key: 'recipient', label: 'Recipient' },
  { key: 'department', label: 'Department' },
  { key: 'studentFee', label: 'Student Fee' },
  { key: 'issuedOn', label: 'Issued On' },
  { key: 'dueReturn', label: 'Due / Return' },
  { key: 'fineDefect', label: 'Fine / Defect' },
  { key: 'status', label: 'Status' },
  { key: 'actions', label: 'Actions', required: true },
];

/**
 * Issue / Return History Page
 * Tracks active and historical campus laptop custody records, overdue statuses,
 * handover conditions, return physical inspections, and receipt downloads.
 */
export const Allocations = () => {
  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const [selectedIds, setSelectedIds] = useState([]);
  const [departments, setDepartments] = useState([]);

  // Metrics summary
  const [metrics, setMetrics] = useState({ total: 0, active: 0, returned: 0, overdue: 0 });

  // Filter, pagination & column state
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [departmentId, setDepartmentId] = useState(searchParams.get('departmentId') || '');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  const [visibleColumns, setVisibleColumns] = useState(() => {
    try {
      const saved = localStorage.getItem('col_pref_allocations');
      return saved ? JSON.parse(saved) : ALLOCATION_COLUMNS.map((c) => c.key);
    } catch {
      return ALLOCATION_COLUMNS.map((c) => c.key);
    }
  });

  // Modal states for return handover and PDF receipt preview
  const [returnAlloc, setReturnAlloc] = useState(null);
  const [receiptAlloc, setReceiptAlloc] = useState(null);

  const debouncedSearch = useDebounce(search, 300);
  const { isStaff } = useAuth();
  const navigate = useNavigate();

  // Load department options for filter dropdown
  useEffect(() => {
    api.get('/departments')
      .then((res) => {
        setDepartments(res.data.data?.departments || []);
      })
      .catch((err) => console.error('Failed to load departments:', err));
  }, []);

  // Load paginated allocations matching search, status, department, and date filters
  const fetchAllocations = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.append('search', debouncedSearch);
      if (status) params.append('status', status);
      if (departmentId) params.append('departmentId', departmentId);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      params.append('page', page);
      params.append('limit', limit);

      const res = await api.get(`/allocations?${params.toString()}`);
      setAllocations(res.data.data.allocations);
      setPagination(res.data.data.pagination);
      if (res.data.data.metrics) {
        setMetrics(res.data.data.metrics);
      }
    } catch (err) {
      console.error('Failed to load allocations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllocations();
  }, [debouncedSearch, status, departmentId, startDate, endDate, page, limit]);

  // Clear selections when page or filters change
  useEffect(() => {
    setSelectedIds([]);
  }, [debouncedSearch, status, departmentId, startDate, endDate, page, limit]);

  const handleResetFilters = () => {
    setSearch('');
    setStatus('');
    setDepartmentId('');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  // Download complete allocation records in Excel (.xlsx) format
  const handleExport = () => {
    downloadFile('/data/export/allocations', 'SSISM_Allocation_Ledger.xlsx');
  };

  const handleToggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === allocations.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(allocations.map((a) => a.id));
    }
  };

  const handleExportSelected = () => {
    if (selectedIds.length === 0) return;
    downloadFile(
      `/data/export/allocations?ids=${selectedIds.join(',')}`,
      `SSISM_Selected_Allocations_${selectedIds.length}.xlsx`
    );
  };

  const handleDeleteAllocation = async (alloc) => {
    if (
      !window.confirm(
        `Are you sure you want to permanently delete this allocation record for ${alloc.asset?.assetTag || 'asset'} (${alloc.recipient?.name || 'recipient'})? If active, the asset status will be restored to AVAILABLE.`
      )
    ) {
      return;
    }
    try {
      await api.delete(`/allocations/${alloc.id}`);
      fetchAllocations();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete allocation');
    }
  };

  const handleDownloadSelectedPDFs = async () => {
    if (selectedIds.length === 0) return;
    for (const id of selectedIds) {
      try {
        await downloadFile(`/data/receipt/${id}/pdf`, `SSISM_Allocation_Receipt_${id}.pdf`);
      } catch (err) {
        console.error(`Failed to download receipt for allocation ${id}:`, err);
      }
    }
  };

  const handlePrintSelected = () => {
    window.print();
  };

  const hasActiveFilters = Boolean(search || status || departmentId || startDate || endDate);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Issue / Return History
          </h1>
        </div>

        <div className="flex items-center space-x-2.5">
          <ColumnVisibilitySelector
            columns={ALLOCATION_COLUMNS}
            visibleColumns={visibleColumns}
            onChange={setVisibleColumns}
            storageKey="col_pref_allocations"
          />

          <button
            onClick={handleExport}
            className="px-3.5 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center space-x-1.5 transition self-start sm:self-auto bg-white shadow-2xs"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {/* 4 Top KPI Metric Cards (Unified Master StatCard Design) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Allocations"
          value={metrics.total}
          icon={ArrowLeftRight}
          color="orange"
          subtitle="Cumulative Issued"
          active={status === ''}
          onClick={() => {
            setStatus('');
            setPage(1);
          }}
        />

        <StatCard
          title="Currently Outstanding"
          value={metrics.active}
          icon={Clock}
          color="green"
          subtitle="In Active Custody"
          active={status === 'ACTIVE'}
          onClick={() => {
            setStatus('ACTIVE');
            setPage(1);
          }}
        />

        <StatCard
          title="Returned to Stock"
          value={metrics.returned}
          icon={CheckCircle2}
          color="blue"
          subtitle="Safely Restored"
          active={status === 'RETURNED'}
          onClick={() => {
            setStatus('RETURNED');
            setPage(1);
          }}
        />

        <StatCard
          title="Overdue Laptops"
          value={metrics.overdue}
          icon={AlertTriangle}
          color="red"
          subtitle="Past Return Due Date"
          active={status === 'OVERDUE'}
          onClick={() => {
            setStatus('OVERDUE');
            setPage(1);
          }}
        />
      </div>

      {/* Comprehensive Filter and Search Bar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-2.5">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search student roll, recipient name, laptop tag, or serial..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-[#F26522] focus:ring-2 focus:ring-orange-500/20 outline-none"
            />
          </div>

          {/* Department Filter */}
          <CustomSelect
            value={departmentId}
            onChange={(val) => {
              setDepartmentId(val);
              setPage(1);
            }}
            placeholder="All Departments"
            options={[
              { value: '', label: 'All Departments' },
              ...departments.map((d) => ({
                value: String(d.id),
                label: d.code ? `${d.code} (${d.name})` : d.name,
              })),
            ]}
            className="w-full md:w-56"
          />

          {/* Status Filter */}
          <CustomSelect
            value={status}
            onChange={(val) => {
              setStatus(val);
              setPage(1);
            }}
            placeholder="All Statuses"
            options={[
              { value: '', label: 'All Statuses' },
              { value: 'ACTIVE', label: 'ACTIVE (In Custody)' },
              { value: 'RETURNED', label: 'RETURNED (Verified)' },
              { value: 'OVERDUE', label: 'OVERDUE (Past Due)' },
            ]}
            className="w-full md:w-52"
          />
        </div>

        {/* Date Range Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-2.5 text-xs">
            <span className="text-slate-500 font-semibold flex items-center space-x-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Issued Date Range:</span>
            </span>
            <div className="flex items-center space-x-1.5">
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPage(1);
                }}
                className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-700 focus:border-[#F26522] outline-none"
                title="From Date"
              />
              <span className="text-slate-400 text-xs">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPage(1);
                }}
                className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-700 focus:border-[#F26522] outline-none"
                title="To Date"
              />
            </div>
          </div>

          {/* Reset Filters Action */}
          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 transition flex items-center space-x-1"
              title="Reset all search and filters"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Clear Filters</span>
            </button>
          )}
        </div>
      </div>

      {/* Allocations Table: Pure white rounded-xl container */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs font-medium">
            <div className="w-8 h-8 border-3 border-orange-200 border-t-[#F26522] rounded-full animate-spin mx-auto mb-2.5" />
            Loading allocations ledger...
          </div>
        ) : allocations.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs font-medium">
            No allocation records found matching your filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10.5px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-2.5 px-2.5 w-8 text-center">
                    <input
                      type="checkbox"
                      aria-label="Select all allocations on this page"
                      checked={allocations.length > 0 && selectedIds.length === allocations.length}
                      onChange={handleSelectAll}
                      className="rounded border-slate-300 text-[#F26522] focus:ring-orange-500/20 cursor-pointer w-4 h-4"
                    />
                  </th>
                  {visibleColumns.includes('asset') && <th className="py-2.5 px-2.5">Laptop Asset</th>}
                  {visibleColumns.includes('recipient') && <th className="py-2.5 px-2.5">Recipient</th>}
                  {visibleColumns.includes('department') && <th className="py-2.5 px-2.5">Dept</th>}
                  {visibleColumns.includes('studentFee') && <th className="py-2.5 px-2.5">Student Fee</th>}
                  {visibleColumns.includes('issuedOn') && <th className="py-2.5 px-2.5">Issued On</th>}
                  {visibleColumns.includes('dueReturn') && <th className="py-2.5 px-2.5">Due / Return</th>}
                  {visibleColumns.includes('fineDefect') && <th className="py-2.5 px-2.5">Fine / Defect</th>}
                  {visibleColumns.includes('status') && <th className="py-2.5 px-2.5">Status</th>}
                  {visibleColumns.includes('actions') && (
                    <th className="py-2.5 px-2.5 text-right whitespace-nowrap">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {allocations.map((alloc) => {
                  const isActive = alloc.status === 'ACTIVE';
                  const isOverdue =
                    isActive && alloc.dueDate && new Date(alloc.dueDate) < new Date();
                  const isSelected = selectedIds.includes(alloc.id);
                  const isStudent = alloc.recipient?.role === 'STUDENT';
                  const feeStatus = alloc.recipient?.licenseFeeRecords?.[0]?.status || 'PAID';

                  const formattedIssueDate = alloc.issuedAt
                    ? new Date(alloc.issuedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                    : '-';
                  const formattedDueDate = alloc.dueDate
                    ? new Date(alloc.dueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                    : 'Open';
                  const formattedReturnDate = alloc.returnedAt
                    ? new Date(alloc.returnedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                    : null;

                  return (
                    <tr
                      key={alloc.id}
                      className={`hover:bg-orange-50/20 transition-colors ${
                        isSelected ? 'bg-orange-50/40' : isOverdue ? 'bg-rose-50/25' : ''
                      }`}
                    >
                      {/* Selection Checkbox */}
                      <td className="py-2.5 px-2.5 w-8 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          aria-label={`Select allocation record ${alloc.id}`}
                          checked={isSelected}
                          onChange={() => handleToggleSelect(alloc.id)}
                          className="rounded border-slate-300 text-[#F26522] focus:ring-orange-500/20 cursor-pointer w-4 h-4"
                        />
                      </td>

                      {/* Laptop Asset */}
                      {visibleColumns.includes('asset') && (
                        <td className="py-2.5 px-2.5 whitespace-nowrap">
                          <div
                            onClick={() => navigate(`/inventory/${alloc.asset.id}`)}
                            className="font-mono font-bold text-[#F26522] hover:underline cursor-pointer"
                          >
                            {alloc.asset.assetTag}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {alloc.asset.make} {alloc.asset.model}
                          </div>
                        </td>
                      )}

                      {/* Recipient */}
                      {visibleColumns.includes('recipient') && (
                        <td className="py-2.5 px-2.5 whitespace-nowrap">
                          <div className="font-bold text-slate-800">{alloc.recipient.name}</div>
                          <div className="font-mono text-[10px] text-slate-400">
                            {alloc.recipient.rollNumberOrEmpId}
                          </div>
                        </td>
                      )}

                      {/* Department */}
                      {visibleColumns.includes('department') && (
                        <td className="py-2.5 px-2.5 whitespace-nowrap font-medium text-slate-700">
                          {alloc.recipient.department?.code || 'Campus'}
                        </td>
                      )}

                      {/* Student Fee Status (Teachers/Faculty Exempt) */}
                      {visibleColumns.includes('studentFee') && (
                        <td className="py-2.5 px-2.5 whitespace-nowrap">
                          {isStudent ? (
                            <span
                              className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                                feeStatus === 'PAID'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-rose-50 text-rose-700 border-rose-200'
                              }`}
                            >
                              {feeStatus}
                            </span>
                          ) : (
                            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                              Exempt
                            </span>
                          )}
                        </td>
                      )}

                      {/* Issued On */}
                      {visibleColumns.includes('issuedOn') && (
                        <td className="py-2.5 px-2.5 whitespace-nowrap text-slate-700 font-medium">
                          {formattedIssueDate}
                        </td>
                      )}

                      {/* Due / Return Date */}
                      {visibleColumns.includes('dueReturn') && (
                        <td className="py-2.5 px-2.5 whitespace-nowrap">
                          {isActive ? (
                            <span className={isOverdue ? 'font-bold text-rose-600' : 'text-slate-700 font-medium'}>
                              {formattedDueDate}
                              {isOverdue && <span className="ml-1 text-[9px] font-extrabold uppercase text-rose-600">(Overdue)</span>}
                            </span>
                          ) : (
                            <span className="text-slate-500 font-medium">
                              {formattedReturnDate}
                            </span>
                          )}
                        </td>
                      )}

                      {/* Damage / Fine Entry */}
                      {visibleColumns.includes('fineDefect') && (
                        <td className="py-2.5 px-2.5 whitespace-nowrap">
                          {alloc.fineAmount > 0 ? (
                            <div>
                              <div className="flex items-center space-x-1">
                                <span className="font-bold text-rose-700 font-mono text-xs">₹{alloc.fineAmount}</span>
                                <span
                                  className={`text-[9px] font-bold px-1 py-0.2 rounded border ${
                                    alloc.finePaid
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : 'bg-rose-50 text-rose-700 border-rose-200'
                                  }`}
                                >
                                  {alloc.finePaid ? `${alloc.finePaymentMode || 'Paid'}` : 'Unpaid'}
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-500 max-w-[130px] truncate" title={alloc.fineReason}>
                                {alloc.fineReason || 'Defect'}
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400 font-mono">-</span>
                          )}
                        </td>
                      )}

                      {/* Status */}
                      {visibleColumns.includes('status') && (
                        <td className="py-2.5 px-2.5 whitespace-nowrap">
                          <Badge status={alloc.status} size="xs" />
                        </td>
                      )}

                      {/* Actions */}
                      {visibleColumns.includes('actions') && (
                        <td className="py-2.5 px-2.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end space-x-1.5 flex-nowrap">
                            {/* View official receipt */}
                            <button
                              onClick={() => setReceiptAlloc(alloc)}
                              title="View / Print Allocation Receipt"
                              className="px-2 py-1 text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition flex items-center space-x-1"
                            >
                              <FileText className="w-3 h-3 text-slate-500" />
                              <span>Receipt</span>
                            </button>

                            {/* Accept Return (Staff only) */}
                            {isStaff && isActive && (
                              <button
                                onClick={() => setReturnAlloc(alloc)}
                                title="Accept Return & Physical Inspection"
                                className="px-2 py-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition flex items-center space-x-1"
                              >
                                <RotateCcw className="w-3 h-3" />
                                <span>Return</span>
                              </button>
                            )}

                            {/* Delete Record (Staff only) */}
                            {isStaff && (
                              <button
                                onClick={() => handleDeleteAllocation(alloc)}
                                title="Permanently Delete Allocation Record"
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
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

        {/* Pagination with Limit Selector */}
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
          itemName="allocations"
        />
      </div>

      {/* Floating Multi-Select Action Bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 backdrop-blur-md text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700/60 flex items-center space-x-3.5 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="flex items-center space-x-2 text-xs font-semibold pr-3 border-r border-slate-700">
            <span className="w-5 h-5 rounded-full bg-[#F26522] text-white flex items-center justify-center text-[10.5px] font-bold">
              {selectedIds.length}
            </span>
            <span>Selected</span>
          </div>

          <button
            onClick={handleExportSelected}
            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center space-x-1.5 transition shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Selected (Excel)</span>
          </button>

          <button
            onClick={handleDownloadSelectedPDFs}
            className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center space-x-1.5 transition shadow-sm"
            title="Download PDF receipts for selected allocations"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>PDF Receipts</span>
          </button>

          <button
            onClick={handlePrintSelected}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center space-x-1.5 transition border border-slate-600"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>

          <button
            onClick={() => setSelectedIds([])}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
            title="Clear Selection"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Return Modal */}
      <ReturnModal
        isOpen={!!returnAlloc}
        onClose={() => setReturnAlloc(null)}
        allocation={returnAlloc}
        onSuccess={() => fetchAllocations()}
      />

      {/* Receipt Modal */}
      <ReceiptModal
        isOpen={!!receiptAlloc}
        onClose={() => setReceiptAlloc(null)}
        allocation={receiptAlloc}
      />
    </div>
  );
};
