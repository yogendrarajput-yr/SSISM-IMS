import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { CustomSelect } from '../components/common/CustomSelect';
import { Pagination } from '../components/common/Pagination';
import { ColumnVisibilitySelector } from '../components/common/ColumnVisibilitySelector';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Trash2, AlertOctagon } from 'lucide-react';

const AUDIT_COLUMNS = [
  { key: 'date', label: 'Date', required: true },
  { key: 'actor', label: 'Actor' },
  { key: 'action', label: 'Action', required: true },
  { key: 'entity', label: 'Target Entity' },
  { key: 'details', label: 'Payload / Details' },
  { key: 'ip', label: 'IP Address' },
  { key: 'actions', label: 'Actions' },
];

/**
 * System Audit Trail Page (Governance & Oversight)
 * Restricted to Super Admin and Higher Management / Auditors.
 * Displays immutable logs of system mutations, allocations, returns, imports, and user logins.
 */
export const AuditLogs = () => {
  const { isSuperAdmin } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  const [visibleColumns, setVisibleColumns] = useState(() => {
    try {
      const saved = localStorage.getItem('col_pref_audit');
      return saved ? JSON.parse(saved) : AUDIT_COLUMNS.map((c) => c.key);
    } catch {
      return AUDIT_COLUMNS.map((c) => c.key);
    }
  });

  // Query audit log history with optional action filter
  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (action) params.append('action', action);
      params.append('page', page);
      params.append('limit', limit);

      const res = await api.get(`/audit-logs?${params.toString()}`);
      setLogs(res.data.data.logs);
      setPagination(res.data.data.pagination);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [action, page, limit]);

  const handleDeleteAuditLog = async (log) => {
    if (
      !window.confirm(
        `Are you sure you want to permanently delete this audit log record (#${log.id} - ${log.action})?`
      )
    ) {
      return;
    }
    try {
      await api.delete(`/audit-logs/${log.id}`);
      fetchLogs();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete audit log');
    }
  };

  const handlePurgeLogs = async () => {
    if (
      !window.confirm(
        'SECURITY WARNING: Are you sure you want to PURGE all system audit trail records? This action is permanent and cannot be undone.'
      )
    ) {
      return;
    }
    try {
      await api.post('/audit-logs/purge');
      fetchLogs();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to purge audit logs');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Governance Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Security & Governance Audit Trail
          </h1>
        </div>

        <div className="flex items-center space-x-2.5">
          <ColumnVisibilitySelector
            columns={AUDIT_COLUMNS}
            visibleColumns={visibleColumns}
            onChange={setVisibleColumns}
            storageKey="col_pref_audit"
          />

          {/* Filter by Specific Audited Action */}
          <CustomSelect
            value={action}
            onChange={(val) => {
              setAction(val);
              setPage(1);
            }}
            placeholder="All Audited Actions"
            options={[
              { value: '', label: 'All Audited Actions' },
              { value: 'ALLOCATION_ISSUED', label: 'ALLOCATION_ISSUED' },
              { value: 'ASSET_RETURNED', label: 'ASSET_RETURNED' },
              { value: 'ASSET_CREATED', label: 'ASSET_CREATED' },
              { value: 'ASSET_UPDATED', label: 'ASSET_UPDATED' },
              { value: 'FEE_STATUS_UPDATED', label: 'FEE_STATUS_UPDATED' },
              { value: 'MAINTENANCE_LOGGED', label: 'MAINTENANCE_LOGGED' },
              { value: 'BULK_ASSET_IMPORT', label: 'BULK_ASSET_IMPORT' },
              { value: 'USER_LOGIN', label: 'USER_LOGIN' },
            ]}
            className="w-full sm:w-60"
          />

          {/* Purge Button (Super Admin Only) */}
          {isSuperAdmin && (
            <button
              onClick={handlePurgeLogs}
              title="Purge all audit logs (Super Admin authority)"
              className="px-3 py-2 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition flex items-center space-x-1.5 whitespace-nowrap shadow-xs"
            >
              <AlertOctagon className="w-3.5 h-3.5 text-rose-500" />
              <span>Purge Audit Trail</span>
            </button>
          )}
        </div>
      </div>

      {/* Audit Logs Table: Pure white rounded-xl container */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs font-medium">
            <div className="w-8 h-8 border-3 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-2.5" />
            Loading governance logs...
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs font-medium">
            No audit logs found for the selected action.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10.5px] font-bold uppercase tracking-wider text-slate-500">
                  {visibleColumns.includes('date') && <th className="py-2.5 px-3">Date</th>}
                  {visibleColumns.includes('actor') && <th className="py-2.5 px-3">Actor</th>}
                  {visibleColumns.includes('action') && <th className="py-2.5 px-3">Action</th>}
                  {visibleColumns.includes('entity') && <th className="py-2.5 px-3">Target Entity</th>}
                  {visibleColumns.includes('details') && <th className="py-2.5 px-3">Payload / Details</th>}
                  {visibleColumns.includes('ip') && (
                    <th className="py-2.5 px-3 text-right whitespace-nowrap">IP Address</th>
                  )}
                  {visibleColumns.includes('actions') && isSuperAdmin && (
                    <th className="py-2.5 px-3 text-right whitespace-nowrap">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    {/* Event Date (Time removed) */}
                    {visibleColumns.includes('date') && (
                      <td className="py-2.5 px-3 text-slate-600 font-medium whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                    )}

                    {/* Actor Information */}
                    {visibleColumns.includes('actor') && (
                      <td className="py-2.5 px-4 font-sans">
                        <div className="font-bold text-slate-800">{log.actor?.name || 'System'}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {log.actor?.role || 'SYSTEM'} • {log.actor?.email}
                        </div>
                      </td>
                    )}

                    {/* Action Name */}
                    {visibleColumns.includes('action') && (
                      <td className="py-2.5 px-4">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-bold text-[10px]">
                          {log.action}
                        </span>
                      </td>
                    )}

                    {/* Target Entity */}
                    {visibleColumns.includes('entity') && (
                      <td className="py-2.5 px-4 text-slate-600 font-sans">
                        <span className="font-semibold">{log.entityType}</span> #{log.entityId}
                      </td>
                    )}

                    {/* Activity Summary / Details */}
                    {visibleColumns.includes('details') && (
                      <td
                        className="py-2.5 px-4 max-w-sm truncate text-[11px] text-slate-600 font-sans"
                        title={typeof log.details === 'object' ? JSON.stringify(log.details) : String(log.details)}
                      >
                        {log.details?.message ||
                          log.details?.reason ||
                          (log.details && typeof log.details === 'object'
                            ? Object.entries(log.details)
                                .map(([k, v]) => `${k}: ${v}`)
                                .slice(0, 2)
                                .join(' • ')
                            : '—')}
                      </td>
                    )}

                    {/* Origin IP Address */}
                    {visibleColumns.includes('ip') && (
                      <td className="py-2.5 px-4 text-right text-slate-400 whitespace-nowrap">
                        {log.ipAddress || '127.0.0.1'}
                      </td>
                    )}

                    {/* Actions (Super Admin only) */}
                    {visibleColumns.includes('actions') && isSuperAdmin && (
                      <td className="py-2.5 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => handleDeleteAuditLog(log)}
                          title="Permanently Delete Audit Record"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
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
          itemName="events"
        />
      </div>
    </div>
  );
};
