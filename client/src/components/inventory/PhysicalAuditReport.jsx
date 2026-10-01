import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Badge } from '../common/Badge';
import { StatCard } from '../common/StatCard';
import { Pagination } from '../common/Pagination';
import { PhysicalVerifyModal } from './PhysicalVerifyModal';
import { useAuth } from '../../context/AuthContext';
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Clock,
  User,
  GraduationCap,
  Briefcase,
  Search,
  Filter,
  CheckCircle,
  Wrench,
  HelpCircle,
  Laptop,
  Calendar,
  CheckSquare,
} from 'lucide-react';

/**
 * PhysicalAuditReport Component
 * 
 * Provides an executive physical custody audit & verification module for laptops.
 * Identifies assets overdue for 6-month or yearly checks, specifically highlighting
 * student-assigned equipment in active campus circulation.
 */
export const PhysicalAuditReport = () => {
  const [reportData, setReportData] = useState({
    assets: [],
    metrics: {},
    pagination: { total: 0, page: 1, limit: 15, totalPages: 1 },
  });
  const [loading, setLoading] = useState(true);

  // Filter States
  const [period, setPeriod] = useState('6_MONTHS'); // '6_MONTHS' | '1_YEAR' | 'ALL'
  const [onlyStudentAssigned, setOnlyStudentAssigned] = useState(false);
  const [auditStatus, setAuditStatus] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // Verification Modal State
  const [verifyingAsset, setVerifyingAsset] = useState(null);
  const { isStaff } = useAuth();

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (period) params.append('period', period);
      if (onlyStudentAssigned) params.append('onlyStudentAssigned', 'true');
      if (auditStatus) params.append('auditStatus', auditStatus);
      if (search.trim()) params.append('search', search.trim());
      params.append('page', String(page));
      params.append('limit', '15');

      const res = await api.get(`/assets/audit/overdue-report?${params.toString()}`);
      if (res.data?.data) {
        setReportData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load physical audit report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [period, onlyStudentAssigned, auditStatus, page]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchReport();
  };

  const metrics = reportData.metrics || {};

  const getStatusBadge = (status, lastVerifiedAt) => {
    if (!lastVerifiedAt) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
          NEVER VERIFIED
        </span>
      );
    }
    switch (status) {
      case 'PHYSICAL_OK':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            PHYSICAL OK
          </span>
        );
      case 'NEEDS_REPAIR':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-800 border border-orange-300">
            NEEDS REPAIR
          </span>
        );
      case 'MISSING':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
            MISSING / UNTRACEABLE
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
            {status || 'UNKNOWN'}
          </span>
        );
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* 1. Metrics Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Overdue (6+ Months)"
          value={metrics.totalOverdue6Months || 0}
          subtitle="Assets unverified > 180 days"
          icon={Clock}
          color="orange"
          active={period === '6_MONTHS'}
          onClick={() => {
            setPeriod('6_MONTHS');
            setPage(1);
          }}
        />

        <StatCard
          title="Overdue (1+ Year)"
          value={metrics.totalOverdue1Year || 0}
          subtitle="Critical custody risk > 365 days"
          icon={AlertTriangle}
          color="red"
          active={period === '1_YEAR'}
          onClick={() => {
            setPeriod('1_YEAR');
            setPage(1);
          }}
        />

        <StatCard
          title="Student-Assigned Overdue"
          value={metrics.studentAssignedOverdueCount || 0}
          subtitle="Laptops in active student custody"
          icon={GraduationCap}
          color="amber"
          active={onlyStudentAssigned}
          onClick={() => {
            setOnlyStudentAssigned((prev) => !prev);
            setPage(1);
          }}
        />

        <StatCard
          title="Physical OK"
          value={metrics.statusCounts?.PHYSICAL_OK || 0}
          subtitle="Verified undamaged hardware"
          icon={ShieldCheck}
          color="green"
          active={auditStatus === 'PHYSICAL_OK'}
          onClick={() => {
            setAuditStatus(auditStatus === 'PHYSICAL_OK' ? '' : 'PHYSICAL_OK');
            setPage(1);
          }}
        />
      </div>

      {/* 2. Interactive Control Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          {/* Audit Verification Period Selector */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
            <button
              onClick={() => {
                setPeriod('6_MONTHS');
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                period === '6_MONTHS'
                  ? 'bg-white text-[#F26522] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Overdue &gt; 6 Months
            </button>
            <button
              onClick={() => {
                setPeriod('1_YEAR');
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                period === '1_YEAR'
                  ? 'bg-white text-rose-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Overdue &gt; 1 Year
            </button>
            <button
              onClick={() => {
                setPeriod('ALL');
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                period === 'ALL'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Laptops Audit
            </button>
          </div>

          {/* Student-Assigned Highlight Toggle */}
          <div className="flex items-center space-x-3">
            <label className="inline-flex items-center space-x-2 cursor-pointer bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl hover:bg-slate-100 transition">
              <input
                type="checkbox"
                checked={onlyStudentAssigned}
                onChange={(e) => {
                  setOnlyStudentAssigned(e.target.checked);
                  setPage(1);
                }}
                className="w-4 h-4 text-[#F26522] rounded border-slate-300 focus:ring-brand-500"
              />
              <span className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-[#F26522]" />
                <span>Student-Assigned Only</span>
              </span>
            </label>

            {/* Audit Status Filter */}
            <select
              value={auditStatus}
              onChange={(e) => {
                setAuditStatus(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-xl text-slate-700 outline-none"
            >
              <option value="">All Verification Statuses</option>
              <option value="UNVERIFIED">Never Verified Only</option>
              <option value="PHYSICAL_OK">Physical OK</option>
              <option value="NEEDS_REPAIR">Needs Repair</option>
              <option value="MISSING">Missing</option>
            </select>
          </div>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="flex items-center space-x-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Asset Tag, Serial, Model, or Assigned Student Name / Roll Number..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none text-slate-800"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-xl transition shadow-xs"
          >
            Search
          </button>
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setPage(1);
                setTimeout(fetchReport, 50);
              }}
              className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 rounded-xl transition"
            >
              Clear
            </button>
          )}
        </form>
      </div>

      {/* 3. Verification Report Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            <div className="w-8 h-8 border-2 border-[#F26522] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Evaluating physical audit compliance...
          </div>
        ) : reportData.assets.length === 0 ? (
          <div className="p-12 text-center">
            <ShieldCheck className="w-12 h-12 text-emerald-500 mx-auto mb-2 opacity-80" />
            <h4 className="text-sm font-bold text-slate-800">No Overdue Laptops in This Category</h4>
            <p className="text-xs text-slate-500 mt-1">
              All hardware assets within the selected filter are physically verified and compliant.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Laptop Tag & Specs</th>
                  <th className="py-3 px-4">Custody & Current Holder</th>
                  <th className="py-3 px-4">Last Physical Check</th>
                  <th className="py-3 px-4">Overdue Timeline</th>
                  <th className="py-3 px-4">Audit Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reportData.assets.map((asset) => {
                  const holder = asset.currentHolder;
                  const isStudent = asset.isStudentAssigned;

                  return (
                    <tr
                      key={asset.id}
                      className={`hover:bg-slate-50/70 transition ${
                        isStudent ? 'bg-orange-50/20' : ''
                      }`}
                    >
                      {/* Laptop Tag & Specs */}
                      <td className="py-3 px-4">
                        <div className="flex items-start space-x-2">
                          <Laptop className="w-4 h-4 text-[#F26522] shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold text-slate-900 block font-mono">
                              {asset.assetTag}
                            </span>
                            <span className="text-[11px] text-slate-500">
                              {asset.make} {asset.model} • S/N: {asset.serialNumber}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Custody / Current Holder (Specifically Highlighting Students) */}
                      <td className="py-3 px-4">
                        {holder ? (
                          <div className="space-y-0.5">
                            <div className="flex items-center space-x-1.5">
                              {isStudent ? (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-800 border border-orange-200">
                                  STUDENT
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                                  {holder.role}
                                </span>
                              )}
                              <span className="font-semibold text-slate-900">{holder.name}</span>
                            </div>
                            <div className="text-[11px] text-slate-500">
                              ID: {holder.rollNumberOrEmpId} {holder.branch ? `• ${holder.branch}` : ''}
                            </div>
                            {holder.phone && (
                              <div className="text-[11px] text-slate-500 font-mono">
                                📞 {holder.phone}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Available in IT Lab
                          </span>
                        )}
                      </td>

                      {/* Last Physical Check & Inspector */}
                      <td className="py-3 px-4">
                        {asset.lastVerifiedAt ? (
                          <div>
                            <span className="font-medium text-slate-800 block">
                              {new Date(asset.lastVerifiedAt).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </span>
                            <span className="text-[11px] text-slate-500">
                              By: {asset.verifiedBy?.name || 'Administrator'}
                            </span>
                            {asset.verificationRemarks && (
                              <p className="text-[10px] text-slate-600 italic mt-0.5 line-clamp-1 max-w-[200px]" title={asset.verificationRemarks}>
                                "{asset.verificationRemarks}"
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">No record on file</span>
                        )}
                      </td>

                      {/* Overdue Timeline */}
                      <td className="py-3 px-4">
                        {asset.isOverdue1Year ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-lg text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                            ⚠️ Overdue &gt; 1 Year ({asset.daysSinceVerification !== null ? `${asset.daysSinceVerification}d` : 'Never'})
                          </span>
                        ) : asset.isOverdue6Months ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-lg text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            ⏳ Overdue &gt; 6 Mos ({asset.daysSinceVerification}d)
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-lg text-[11px] font-semibold bg-emerald-50 text-emerald-700">
                            ✓ Verified ({asset.daysSinceVerification}d ago)
                          </span>
                        )}
                      </td>

                      {/* Audit Status */}
                      <td className="py-3 px-4">
                        {getStatusBadge(asset.auditStatus, asset.lastVerifiedAt)}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {isStaff && (
                          <button
                            onClick={() => setVerifyingAsset(asset)}
                            className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-[#F26522] text-white font-bold text-xs shadow-xs transition"
                          >
                            <CheckSquare className="w-3.5 h-3.5" />
                            <span>Mark Verified</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {reportData.pagination && reportData.pagination.totalPages > 1 && (
          <div className="p-4 border-t border-slate-100">
            <Pagination
              currentPage={reportData.pagination.page}
              totalPages={reportData.pagination.totalPages}
              totalItems={reportData.pagination.total}
              pageSize={reportData.pagination.limit}
              onPageChange={(p) => setPage(p)}
            />
          </div>
        )}
      </div>

      {/* Physical Verification Action Modal */}
      <PhysicalVerifyModal
        isOpen={Boolean(verifyingAsset)}
        onClose={() => setVerifyingAsset(null)}
        asset={verifyingAsset}
        onSuccess={() => {
          fetchReport();
        }}
      />
    </div>
  );
};
