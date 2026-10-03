import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { StatCard } from '../components/common/StatCard';
import { Badge } from '../components/common/Badge';
import { AllocateModal } from '../components/allocation/AllocateModal';
import { ReturnModal } from '../components/allocation/ReturnModal';
import { QuickReturnModal } from '../components/allocation/QuickReturnModal';
import { ReceiptModal } from '../components/allocation/ReceiptModal';
import { CustomSelect } from '../components/common/CustomSelect';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  Laptop,
  CheckCircle2,
  Clock,
  Wrench,
  ArrowRight,
  PlusCircle,
  Receipt,
  Building,
  Activity,
  CreditCard,
  Filter,
  RotateCcw,
  Calendar,
  AlertTriangle,
} from 'lucide-react';

/**
 * Dashboard Overview Page
 * Displays aggregated real-time metrics, department distributions, hardware health,
 * and quick-action shortcuts for campus laptop management.
 */
export const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [allocateOpen, setAllocateOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [selectedReturnAlloc, setSelectedReturnAlloc] = useState(null);
  const [dueRangeFilter, setDueRangeFilter] = useState('7_DAYS');
  const [activeReceipt, setActiveReceipt] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [departmentId, setDepartmentId] = useState('');
  const [make, setMake] = useState('');
  const [isFiltering, setIsFiltering] = useState(false);

  const { isStaff } = useAuth();
  const navigate = useNavigate();

  // Load department options for live filter bar
  useEffect(() => {
    api.get('/departments')
      .then((res) => {
        setDepartments(res.data.data?.departments || []);
      })
      .catch((err) => console.error('Failed to load departments for filter:', err));
  }, []);

  // Load aggregated dashboard analytics from backend API with optional filters
  const fetchStats = async () => {
    try {
      setIsFiltering(true);
      const params = {};
      if (departmentId) params.departmentId = departmentId;
      if (make) params.make = make;

      const res = await api.get('/assets/stats', { params });
      setData(res.data.data);
    } catch (err) {
      console.error('Failed to load dashboard metrics:', err);
    } finally {
      setLoading(false);
      setIsFiltering(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [departmentId, make]);

  // Post-allocation callback to refresh counts and show receipt preview
  const handleAllocationSuccess = (allocation) => {
    fetchStats();
    setActiveReceipt(allocation);
  };

  // Loading spinner state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-9 h-9 border-4 border-orange-200 border-t-[#F26522] rounded-full animate-spin" />
          <p className="text-xs font-bold text-slate-500">Loading SSISM Portal metrics...</p>
        </div>
      </div>
    );
  }

  // Extract metrics & fee totals with fallbacks
  const metrics = data?.metrics || { total: 0, available: 0, issued: 0, underMaintenance: 0, retired: 0 };
  const conditionStats = data?.conditionStats || [];
  const departmentAssets = data?.departmentAssets || [];
  const recentAllocations = data?.recentAllocations || [];
  const recentMaintenance = data?.recentMaintenance || [];
  const feeStats = data?.feeStats || [];

  const paidFees = feeStats.find((f) => f.status === 'PAID')?._count?.status || 0;
  const unpaidFees = feeStats.find((f) => f.status === 'UNPAID')?._count?.status || 0;
  const totalFees = paidFees + unpaidFees;
  const clearanceRate = totalFees > 0 ? Math.round((paidFees / totalFees) * 100) : 100;

  const upcomingReturns = data?.upcomingReturns || [];
  const nowMs = Date.now();
  const filteredReturns = upcomingReturns.filter((item) => {
    const returnDate = item.expectedReturnDate || item.dueDate;
    if (!returnDate) return false;
    const dueTime = new Date(returnDate).getTime();
    const diffDays = Math.ceil((dueTime - nowMs) / (1000 * 60 * 60 * 24));
    if (dueRangeFilter === '7_DAYS') {
      return diffDays <= 7;
    }
    return diffDays <= 30;
  });

  return (
    <div className="space-y-6">
      {/* Hero Header (Clean, minimal design without redundant text badges or paragraphs) */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-xl p-6 sm:p-7 text-white shadow-xs border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden">
        {/* Subtle Ambient Glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#F26522]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Campus Hardware & Laptop Operations
          </h1>
        </div>

        {isStaff && (
          <div className="flex flex-wrap gap-2.5 relative z-10">
            <button
              onClick={() => setAllocateOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-[#F26522] hover:bg-orange-600 text-white font-bold text-xs shadow-md shadow-orange-500/25 flex items-center space-x-2 transition active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ Issue / Allocate Laptop</span>
            </button>
            <button
              onClick={() => setReturnOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-500/25 flex items-center space-x-2 transition active:scale-95"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Return / Submit Laptop</span>
            </button>
            <button
              onClick={() => navigate('/inventory')}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs transition border border-white/20"
            >
              View Inventory
            </button>
          </div>
        )}
      </div>

      {/* Global Real-Time Operational Filter Bar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center space-x-2 text-slate-700">
          <div className="p-1.5 rounded-lg bg-orange-50 text-[#F26522] border border-orange-200/60">
            <Filter className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Live Metrics Filter:</span>
          {isFiltering && (
            <span className="text-[11px] font-semibold text-orange-600 animate-pulse">Updating...</span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Department Filter */}
          <CustomSelect
            value={departmentId}
            onChange={(val) => setDepartmentId(val)}
            placeholder="All Departments"
            options={[
              { value: '', label: 'All Departments' },
              ...departments.map((d) => ({
                value: String(d.id),
                label: d.code ? `${d.code} (${d.name})` : d.name,
              })),
            ]}
            className="w-full sm:w-60"
          />

          {/* Brand / Make Filter */}
          <CustomSelect
            value={make}
            onChange={(val) => setMake(val)}
            placeholder="All Brands / Makes"
            options={[
              { value: '', label: 'All Brands / Makes' },
              ...(data?.makes || ['Dell', 'HP', 'Lenovo']).map((m) => ({
                value: m,
                label: `${m} Fleet`,
              })),
            ]}
            className="w-full sm:w-52"
          />

          {/* Reset Filters button if any active filter */}
          {(departmentId || make) && (
            <button
              onClick={() => {
                setDepartmentId('');
                setMake('');
              }}
              className="px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 transition flex items-center space-x-1"
              title="Reset live filters"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>
      </div>

      {/* 5 Primary Metric Cards (Orange for Total, Green for Active, Blue for Finance, Red for Maintenance/Issues) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Total Laptops"
          value={metrics.total}
          icon={Laptop}
          color="orange"
          onClick={() => navigate('/inventory')}
        />
        <StatCard
          title="Active in Stock"
          value={metrics.available}
          icon={CheckCircle2}
          color="green"
          onClick={() => navigate('/inventory?status=AVAILABLE')}
        />
        <StatCard
          title="Currently Issued"
          value={metrics.issued}
          icon={Clock}
          color="green"
          onClick={() => navigate('/allocations')}
        />
        <StatCard
          title="Fee Clearance"
          value={`${clearanceRate}%`}
          icon={CreditCard}
          color="blue"
          onClick={() => navigate('/fees')}
        />
        <StatCard
          title="Maintenance & Repairs"
          value={metrics.underMaintenance + metrics.retired}
          icon={Wrench}
          color="red"
          onClick={() => navigate('/maintenance')}
        />
      </div>

      {/* Return Tracking & Due Surveillance Section */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-orange-50 text-[#D9531E] border border-orange-200 flex items-center justify-center font-bold">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-slate-900 tracking-tight">
                Asset Return Schedule & Surveillance
              </h2>
              <p className="text-[11px] text-slate-500 font-medium">
                Live monitoring of assets scheduled for return based on expected return dates
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <div className="inline-flex rounded-xl bg-slate-100 p-1 space-x-1 text-xs">
              <button
                type="button"
                onClick={() => setDueRangeFilter('7_DAYS')}
                className={`px-3 py-1 rounded-lg transition font-semibold flex items-center space-x-1.5 ${
                  dueRangeFilter === '7_DAYS'
                    ? 'bg-[#D9531E] text-white shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>Due in 7 Days</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  dueRangeFilter === '7_DAYS' ? 'bg-white/25 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {metrics.dueThisWeek || 0}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setDueRangeFilter('30_DAYS')}
                className={`px-3 py-1 rounded-lg transition flex items-center space-x-1.5 font-semibold ${
                  dueRangeFilter === '30_DAYS'
                    ? 'bg-blue-600 text-white shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>Due in 30 Days</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  dueRangeFilter === '30_DAYS' ? 'bg-white/25 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {metrics.dueThisMonth || 0}
                </span>
              </button>
            </div>

            <button
              onClick={() => navigate(`/allocations?dueRange=${dueRangeFilter}`)}
              className="text-xs font-bold text-[#D9531E] hover:underline flex items-center space-x-1 pl-2"
            >
              <span>View In Ledger</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Dynamic Metric Counter Tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div
            onClick={() => {
              setDueRangeFilter('7_DAYS');
            }}
            className={`p-3.5 rounded-xl border transition cursor-pointer flex items-center justify-between ${
              dueRangeFilter === '7_DAYS'
                ? 'bg-orange-50/60 border-[#D9531E]'
                : 'bg-slate-50/70 border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-orange-100 text-[#D9531E] flex items-center justify-center font-bold">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Laptops Due This Week
                </div>
                <div className="text-xl font-extrabold text-slate-900">
                  {metrics.dueThisWeek || 0} <span className="text-xs font-normal text-slate-500">laptops scheduled</span>
                </div>
              </div>
            </div>
            <span className="text-xs font-bold text-[#D9531E]">
              {dueRangeFilter === '7_DAYS' ? '● Active View' : 'Filter View →'}
            </span>
          </div>

          <div
            onClick={() => {
              setDueRangeFilter('30_DAYS');
            }}
            className={`p-3.5 rounded-xl border transition cursor-pointer flex items-center justify-between ${
              dueRangeFilter === '30_DAYS'
                ? 'bg-blue-50/60 border-blue-500'
                : 'bg-slate-50/70 border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Laptops Due This Month
                </div>
                <div className="text-xl font-extrabold text-slate-900">
                  {metrics.dueThisMonth || 0} <span className="text-xs font-normal text-slate-500">laptops scheduled</span>
                </div>
              </div>
            </div>
            <span className="text-xs font-bold text-blue-600">
              {dueRangeFilter === '30_DAYS' ? '● Active View' : 'Filter View →'}
            </span>
          </div>
        </div>

        {/* Filtered Table View of Upcoming Returns */}
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          {filteredReturns.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs font-medium">
              No laptops scheduled for return in the upcoming {dueRangeFilter === '7_DAYS' ? '7 days' : '30 days'}.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10.5px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-2.5 px-3">Laptop Asset</th>
                    <th className="py-2.5 px-3">Current Holder</th>
                    <th className="py-2.5 px-3">Role / Dept</th>
                    <th className="py-2.5 px-3">Expected Return Date</th>
                    <th className="py-2.5 px-3">Due Status</th>
                    {isStaff && <th className="py-2.5 px-3 text-right">Quick Action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredReturns.map((alloc) => {
                    const returnDate = alloc.expectedReturnDate || alloc.dueDate;
                    const dueTime = new Date(returnDate).getTime();
                    const diffDays = Math.ceil((dueTime - nowMs) / (1000 * 60 * 60 * 24));
                    const isOverdue = diffDays < 0;

                    return (
                      <tr key={alloc.id} className="hover:bg-orange-50/20 transition-colors">
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <div
                            onClick={() => navigate(`/inventory/${alloc.asset.id}`)}
                            className="font-mono font-bold text-[#D9531E] hover:underline cursor-pointer"
                          >
                            {alloc.asset.assetTag}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {alloc.asset.make} {alloc.asset.model}
                          </div>
                        </td>

                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <div className="font-bold text-slate-900">{alloc.recipient.name}</div>
                          <div className="font-mono text-[10px] text-slate-400">
                            {alloc.recipient.rollNumberOrEmpId}
                          </div>
                        </td>

                        <td className="py-2.5 px-3 whitespace-nowrap text-slate-600">
                          <div>{alloc.recipient.role}</div>
                          <div className="text-[10px] text-slate-400">
                            {alloc.recipient.department?.code || alloc.recipient.department?.name || 'General'}
                          </div>
                        </td>

                        <td className="py-2.5 px-3 whitespace-nowrap font-medium text-slate-800">
                          {new Date(returnDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>

                        <td className="py-2.5 px-3 whitespace-nowrap">
                          {isOverdue ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-rose-100 text-rose-700 border border-rose-200">
                              Overdue by {Math.abs(diffDays)}d
                            </span>
                          ) : diffDays === 0 ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300">
                              Due Today
                            </span>
                          ) : diffDays <= 7 ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-50 text-amber-900 border border-amber-300">
                              Due in {diffDays} {diffDays === 1 ? 'day' : 'days'}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                              Due in {diffDays} days
                            </span>
                          )}
                        </td>

                        {isStaff && (
                          <td className="py-2.5 px-3 whitespace-nowrap text-right">
                            <button
                              type="button"
                              onClick={() => setSelectedReturnAlloc(alloc)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition shadow-2xs inline-flex items-center space-x-1"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Return Asset</span>
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Section 2: Department Distribution & Physical Condition */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Department Asset Allocation Breakdown */}
        <div className="lg:col-span-2 bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-900 tracking-tight flex items-center space-x-2">
              <Building className="w-4 h-4 text-[#F26522]" />
              <span>Mapped Department Distributions</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {departmentAssets.map((dept) => {
              const shortFormMapping = {
                'IT Excellence Group': 'ITEG',
                'Management Excellence Group': 'MEG',
                'Bio Excellence Group': 'BEG',
                'Bachelor of Technology': 'B.Tech',
                'Account': 'ACC',
                'Faculty': 'FAC',
                'Library': 'LIB',
                'SSS Company': 'SSS',
                'Higher Authority': 'HA',
                'Others': 'OTH',
              };
              const shortCode =
                (dept.code && dept.code.length <= 8 ? dept.code : null) ||
                shortFormMapping[dept.name] ||
                shortFormMapping[dept.code] ||
                dept.code ||
                dept.name;

              return (
                <div
                  key={dept.code || dept.name}
                  onClick={() => navigate(dept.id ? `/inventory?departmentId=${dept.id}` : '/inventory')}
                  className="p-3.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 hover:shadow-xs cursor-pointer transition-all duration-150 flex flex-col justify-between"
                  title={`View ${dept.name} laptops in inventory`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <span className="font-mono text-xs font-extrabold text-[#F26522] bg-orange-50 px-2.5 py-0.5 rounded-md border border-orange-200/80 tracking-wide">
                      {shortCode}
                    </span>
                    <span className="text-[10px] font-medium text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-200/60 shrink-0">
                      {dept._count.users} users
                    </span>
                  </div>
                  <div className="mt-2.5">
                    <div className="text-sm font-extrabold text-slate-800">
                      {dept._count.assets} Laptops
                    </div>
                    <div className="text-[10.5px] text-slate-500 font-semibold tracking-tight" title={dept.name}>
                      {shortCode} Division
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Condition Health & License Fee Ratio */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between space-y-5">
          <div>
            <h2 className="text-sm font-bold text-slate-900 tracking-tight flex items-center space-x-2 mb-3">
              <Activity className="w-4 h-4 text-emerald-600" />
              <span>Hardware Physical Health</span>
            </h2>

            <div className="space-y-2.5">
              {conditionStats.map((cond) => {
                const count = cond._count.condition;
                const pct = metrics.total > 0 ? Math.round((count / metrics.total) * 100) : 0;
                return (
                  <div
                    key={cond.condition}
                    onClick={() => navigate(`/inventory?condition=${cond.condition}`)}
                    className="space-y-1 p-1 rounded-lg hover:bg-slate-50 cursor-pointer transition"
                    title={`Filter inventory by ${cond.condition} condition`}
                  >
                    <div className="flex justify-between text-xs font-semibold">
                      <Badge status={cond.condition} size="xs" />
                      <span className="text-slate-600 font-mono text-[11px]">{count} units ({pct}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-[#F26522] h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Software License Fee Ratio Summary */}
          <div className="p-3.5 rounded-xl bg-orange-50/70 border border-orange-200">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-orange-950 flex items-center space-x-1.5">
                <Receipt className="w-4 h-4 text-[#F26522]" />
                <span>Software Fee Clearance</span>
              </span>
              <span className="text-xs font-extrabold text-orange-700">{clearanceRate}% Cleared</span>
            </div>
            <div className="flex justify-between text-[11px] text-slate-600">
              <span className="text-emerald-700 font-bold">{paidFees} Cleared (PAID)</span>
              <span className="text-rose-600 font-bold">{unpaidFees} Action (UNPAID)</span>
            </div>
            <button
              onClick={() => navigate('/fees')}
              className="mt-2.5 w-full py-1.5 rounded-lg bg-[#F26522] hover:bg-orange-600 text-white text-xs font-bold transition flex items-center justify-center space-x-1 shadow-xs"
            >
              <span>Manage Fee Registry</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Section 3: Recent Activity Feeds */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Laptop Allocations */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2.5">
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">
              Recent Issue / Return Activity
            </h2>
            <button
              onClick={() => navigate('/allocations')}
              className="text-xs font-bold text-[#F26522] hover:underline flex items-center space-x-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>


          <div className="divide-y divide-slate-100">
            {recentAllocations.map((alloc) => (
              <div
                key={alloc.id}
                onClick={() => navigate(`/allocations?search=${encodeURIComponent(alloc.asset.assetTag)}`)}
                className="py-2.5 flex items-center justify-between hover:bg-slate-50 px-2 rounded-lg transition cursor-pointer"
                title={`View allocation record for ${alloc.asset.assetTag}`}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-orange-50 text-[#F26522] flex items-center justify-center font-bold text-xs border border-orange-100">
                    <Laptop className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 flex items-center space-x-1.5">
                      <span className="font-mono text-[#F26522]">{alloc.asset.assetTag}</span>
                      <span className="text-[10.5px] font-normal text-slate-400">({alloc.asset.model})</span>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Holder: <strong>{alloc.recipient.name}</strong> ({alloc.recipient.rollNumberOrEmpId})
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] font-semibold text-slate-700">
                    {new Date(alloc.issuedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                  <div className="text-[10px] text-slate-400">By {alloc.issuedBy.name.split(' ')[0]}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Hardware Repairs & Upgrades */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2.5">
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">
              Hardware Maintenance & Upgrades
            </h2>
            <button
              onClick={() => navigate('/maintenance')}
              className="text-xs font-bold text-[#F26522] hover:underline flex items-center space-x-1"
            >
              <span>View Logs</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {recentMaintenance.map((m) => (
              <div
                key={m.id}
                onClick={() => navigate(`/maintenance?search=${encodeURIComponent(m.asset.assetTag)}`)}
                className="py-2.5 flex items-center justify-between hover:bg-slate-50 px-2 rounded-lg transition cursor-pointer"
                title={`View maintenance history for ${m.asset.assetTag}`}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-bold text-xs border border-rose-100">
                    <Wrench className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 flex items-center space-x-1.5">
                      <span className="font-mono text-slate-800">{m.asset.assetTag}</span>
                      <span className="text-[9.5px] font-bold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded">
                        {m.type.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 truncate max-w-xs">{m.description}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-slate-800">
                    {m.cost ? `₹${parseFloat(m.cost).toLocaleString('en-IN')}` : 'General'}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {new Date(m.performedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Allocation Handover Modal */}
      <AllocateModal
        isOpen={allocateOpen}
        onClose={() => setAllocateOpen(false)}
        onSuccess={handleAllocationSuccess}
      />

      {/* Direct Quick Return & Physical Inspection Modal */}
      <QuickReturnModal
        isOpen={returnOpen}
        onClose={() => setReturnOpen(false)}
        onSuccess={(returnedAllocation) => {
          fetchStats();
        }}
        onOpenReceipt={(returnedAllocation) => {
          setActiveReceipt(returnedAllocation);
        }}
      />

      {/* Targeted Return Modal for scheduled return asset */}
      {selectedReturnAlloc && (
        <ReturnModal
          isOpen={!!selectedReturnAlloc}
          onClose={() => setSelectedReturnAlloc(null)}
          allocation={selectedReturnAlloc}
          onSuccess={(returnedAllocation) => {
            setSelectedReturnAlloc(null);
            fetchStats();
            if (returnedAllocation) {
              setActiveReceipt(returnedAllocation);
            }
          }}
        />
      )}

      {/* Receipt Modal with Print & PDF download */}
      <ReceiptModal
        isOpen={!!activeReceipt}
        onClose={() => setActiveReceipt(null)}
        allocation={activeReceipt}
      />
    </div>
  );
};
