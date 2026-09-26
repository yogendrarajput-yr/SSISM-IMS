import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useDebounce } from '../hooks/useDebounce';
import { useNavigate } from 'react-router-dom';
import { CustomSelect } from '../components/common/CustomSelect';
import { StatCard } from '../components/common/StatCard';
import { Pagination } from '../components/common/Pagination';
import { ColumnVisibilitySelector } from '../components/common/ColumnVisibilitySelector';
import { useAuth } from '../context/AuthContext';
import { Wrench, Search, Trash2, IndianRupee, Cpu, CheckCircle } from 'lucide-react';

const MAINTENANCE_COLUMNS = [
  { key: 'laptop', label: 'Laptop Tag', required: true },
  { key: 'type', label: 'Operation Type' },
  { key: 'description', label: 'Technical Description' },
  { key: 'vendor', label: 'Vendor / Technician' },
  { key: 'cost', label: 'Cost (₹)' },
  { key: 'date', label: 'Date' },
  { key: 'loggedBy', label: 'Logged By' },
  { key: 'actions', label: 'Actions', required: true },
];

/**
 * Hardware Maintenance & Upgrade History Page
 * Displays campus-wide hardware upgrade logs (RAM/SSD), battery replacements,
 * screen repairs, expenditure totals, and technician notes.
 */
export const MaintenanceLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCost, setTotalCost] = useState(0);

  // Search, filter, and pagination states
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  const [visibleColumns, setVisibleColumns] = useState(() => {
    try {
      const saved = localStorage.getItem('col_pref_maintenance');
      return saved ? JSON.parse(saved) : MAINTENANCE_COLUMNS.map((c) => c.key);
    } catch {
      return MAINTENANCE_COLUMNS.map((c) => c.key);
    }
  });

  const debouncedSearch = useDebounce(search, 300);
  const navigate = useNavigate();
  const { isStaff } = useAuth();

  // Query maintenance logs from backend with debounced search
  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.append('search', debouncedSearch);
      if (type) params.append('type', type);
      params.append('page', page);
      params.append('limit', limit);

      const res = await api.get(`/maintenance?${params.toString()}`);
      setLogs(res.data.data.logs);
      setTotalCost(res.data.data.totalCost || 0);
      setPagination(res.data.data.pagination);
    } catch (err) {
      console.error('Failed to load maintenance logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [debouncedSearch, type, page, limit]);

  const handleDeleteMaintenance = async (log) => {
    if (
      !window.confirm(
        `Are you sure you want to permanently delete this maintenance log for laptop ${log.asset?.assetTag}?`
      )
    ) {
      return;
    }
    try {
      await api.delete(`/maintenance/${log.id}`);
      fetchLogs();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete maintenance log');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Hardware Upgrades & Maintenance Registry
          </h1>
        </div>

        <ColumnVisibilitySelector
          columns={MAINTENANCE_COLUMNS}
          visibleColumns={visibleColumns}
          onChange={setVisibleColumns}
          storageKey="col_pref_maintenance"
        />
      </div>

      {/* Unified Master StatCards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Total Maintenance Records"
          value={pagination.total}
          icon={Wrench}
          color="orange"
          active={type === ''}
          onClick={() => {
            setType('');
            setPage(1);
          }}
        />

        <StatCard
          title="Total Expenditure"
          value={`₹${parseFloat(totalCost).toLocaleString('en-IN')}`}
          icon={IndianRupee}
          color="red"
        />

        <StatCard
          title="Filtered Records"
          value={logs.length}
          icon={Cpu}
          color="blue"
        />
      </div>

      {/* Filter and Search Controls */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by laptop tag, serial, vendor, or description..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-[#F26522] focus:ring-2 focus:ring-orange-500/20 outline-none"
          />
        </div>

        {/* Operation Type Dropdown */}
        <CustomSelect
          value={type}
          onChange={(val) => {
            setType(val);
            setPage(1);
          }}
          placeholder="All Operation Types"
          options={[
            { value: '', label: 'All Operation Types' },
            { value: 'RAM_UPGRADE', label: 'RAM Upgrades' },
            { value: 'SSD_UPGRADE', label: 'SSD Storage Upgrades' },
            { value: 'BATTERY_REPLACEMENT', label: 'Battery Replacements' },
            { value: 'SCREEN_REPAIR', label: 'Screen Repairs' },
            { value: 'KEYBOARD_REPAIR', label: 'Keyboard Repairs' },
            { value: 'GENERAL_SERVICE', label: 'General Servicing & Cleaning' },
            { value: 'OS_INSTALLATION', label: 'OS Image Installations' },
            { value: 'OTHER', label: 'Other Repairs' },
          ]}
          className="w-full sm:w-64"
        />
      </div>

      {/* Maintenance Table: Pure white rounded-xl container */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs font-medium">
            <div className="w-8 h-8 border-3 border-orange-200 border-t-[#F26522] rounded-full animate-spin mx-auto mb-2.5" />
            Loading maintenance history...
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs font-medium">
            No maintenance records found matching your filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10.5px] font-bold uppercase tracking-wider text-slate-500">
                  {visibleColumns.includes('laptop') && <th className="py-2.5 px-3">Laptop Tag</th>}
                  {visibleColumns.includes('type') && <th className="py-2.5 px-3">Operation Type</th>}
                  {visibleColumns.includes('description') && <th className="py-2.5 px-3">Technical Description</th>}
                  {visibleColumns.includes('vendor') && <th className="py-2.5 px-3">Vendor / Technician</th>}
                  {visibleColumns.includes('cost') && <th className="py-2.5 px-3">Cost (₹)</th>}
                  {visibleColumns.includes('date') && <th className="py-2.5 px-3">Date</th>}
                  {visibleColumns.includes('loggedBy') && (
                    <th className="py-2.5 px-3 text-right whitespace-nowrap">Logged By</th>
                  )}
                  {visibleColumns.includes('actions') && (
                    <th className="py-2.5 px-3 text-right whitespace-nowrap">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-orange-50/20 transition-colors">
                    {/* Laptop Tag */}
                    {visibleColumns.includes('laptop') && (
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div
                          onClick={() => navigate(`/inventory/${log.asset.id}`)}
                          className="font-mono font-bold text-[#F26522] hover:underline cursor-pointer"
                        >
                          {log.asset.assetTag}
                        </div>
                        <div className="text-[10px] text-slate-400">{log.asset.make} {log.asset.model}</div>
                      </td>
                    )}

                    {/* Operation Type Pill */}
                    {visibleColumns.includes('type') && (
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-bold text-[10px] uppercase">
                          {log.type.replace(/_/g, ' ')}
                        </span>
                      </td>
                    )}

                    {/* Technical Description */}
                    {visibleColumns.includes('description') && (
                      <td className="py-2.5 px-3 max-w-xs text-slate-700">
                        {log.description}
                      </td>
                    )}

                    {/* Vendor or Technician */}
                    {visibleColumns.includes('vendor') && (
                      <td className="py-2.5 px-3 text-slate-600 font-medium whitespace-nowrap">
                        {log.vendorOrTechnician || 'Campus Technician'}
                      </td>
                    )}

                    {/* Cost */}
                    {visibleColumns.includes('cost') && (
                      <td className="py-2.5 px-3 font-bold text-slate-800 whitespace-nowrap">
                        {log.cost ? `₹${parseFloat(log.cost).toLocaleString('en-IN')}` : 'General'}
                      </td>
                    )}

                    {/* Performance Date */}
                    {visibleColumns.includes('date') && (
                      <td className="py-2.5 px-3 text-slate-600 font-medium whitespace-nowrap">
                        {new Date(log.performedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                    )}

                    {/* Logged by Staff */}
                    {visibleColumns.includes('loggedBy') && (
                      <td className="py-2.5 px-4 text-right text-slate-500 whitespace-nowrap">
                        {log.performedBy?.name || 'Staff'}
                      </td>
                    )}

                    {/* Actions */}
                    {visibleColumns.includes('actions') && (
                      <td className="py-2.5 px-4 text-right whitespace-nowrap">
                        {isStaff && (
                          <button
                            onClick={() => handleDeleteMaintenance(log)}
                            title="Permanently Delete Maintenance Record"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
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
          itemName="maintenance logs"
        />
      </div>
    </div>
  );
};
