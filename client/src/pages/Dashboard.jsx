import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { StatCard } from '../components/common/StatCard';
import { Badge } from '../components/common/Badge';
import { AllocateModal } from '../components/allocation/AllocateModal';
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
                  onClick={() => navigate(`/inventory`)}
                  className="p-3.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 hover:shadow-xs cursor-pointer transition-all duration-150 flex flex-col justify-between"
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
                  <div key={cond.condition} className="space-y-1">
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
              <div key={alloc.id} className="py-2.5 flex items-center justify-between hover:bg-slate-50 px-2 rounded-lg transition">
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
              <div key={m.id} className="py-2.5 flex items-center justify-between hover:bg-slate-50 px-2 rounded-lg transition">
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

      {/* Receipt Modal with Print & PDF download */}
      <ReceiptModal
        isOpen={!!activeReceipt}
        onClose={() => setActiveReceipt(null)}
        allocation={activeReceipt}
      />
    </div>
  );
};
