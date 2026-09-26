import React, { useState, useEffect } from 'react';
import { api, downloadFile } from '../services/api';
import { Badge } from '../components/common/Badge';
import { StatCard } from '../components/common/StatCard';
import { Pagination } from '../components/common/Pagination';
import { ColumnVisibilitySelector } from '../components/common/ColumnVisibilitySelector';
import { AllocateModal } from '../components/allocation/AllocateModal';
import { ReceiptModal } from '../components/allocation/ReceiptModal';
import { AddMaintenanceModal } from '../components/maintenance/AddMaintenanceModal';
import { Modal } from '../components/common/Modal';
import { CustomSelect } from '../components/common/CustomSelect';
import { AssetDrawer } from '../components/inventory/AssetDrawer';
import { useAuth } from '../context/AuthContext';
import { useDebounce } from '../hooks/useDebounce';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Laptop,
  Search,
  Plus,
  Eye,
  Wrench,
  Download,
  CheckCircle,
  FileSpreadsheet,
  Printer,
  X,
  Users,
  Gift,
  Trash2,
} from 'lucide-react';

const INVENTORY_COLUMNS = [
  { key: 'assetTag', label: 'Asset Tag / Serial', required: true },
  { key: 'makeModel', label: 'Make & Model' },
  { key: 'source', label: 'Acquisition / Donor' },
  { key: 'condition', label: 'Condition' },
  { key: 'status', label: 'Status' },
  { key: 'holder', label: 'Current Holder' },
  { key: 'actions', label: 'Actions', required: true },
];

export const Inventory = () => {
  const [assets, setAssets] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [donors, setDonors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const [summary, setSummary] = useState([]);
  const [acquisitionSummary, setAcquisitionSummary] = useState([]);
  const [availableMakes, setAvailableMakes] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);

  // Drawer state
  const [drawerAsset, setDrawerAsset] = useState(null);

  // Filters & pagination
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [condition, setCondition] = useState('');
  const [make, setMake] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [acquisitionSource, setAcquisitionSource] = useState('');
  const [donorId, setDonorId] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  const [visibleColumns, setVisibleColumns] = useState(() => {
    try {
      const saved = localStorage.getItem('col_pref_inventory');
      return saved ? JSON.parse(saved) : INVENTORY_COLUMNS.map((c) => c.key);
    } catch {
      return INVENTORY_COLUMNS.map((c) => c.key);
    }
  });

  // Modals state
  const [allocateAsset, setAllocateAsset] = useState(null);
  const [maintenanceAsset, setMaintenanceAsset] = useState(null);
  const [activeReceipt, setActiveReceipt] = useState(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // New Asset Form State
  const [newAsset, setNewAsset] = useState({
    assetTag: '',
    serialNumber: '',
    make: 'Dell',
    model: '',
    processor: 'Intel Core i5-1135G7',
    generation: '11th Gen Intel',
    ram: '16GB DDR4',
    storage: '512GB NVMe SSD',
    displaySize: '14 inch',
    color: 'Platinum Silver',
    chargerSerial: '',
    hasBag: true,
    hasMouse: false,
    condition: 'BRAND_NEW',
    status: 'AVAILABLE',
    acquisitionSource: 'PURCHASED',
    donorId: '',
    departmentId: '',
    remarks: '',
  });

  const debouncedSearch = useDebounce(search, 300);
  const { isStaff } = useAuth();
  const navigate = useNavigate();

  const fetchAssets = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.append('search', debouncedSearch);
      if (status) params.append('status', status);
      if (condition) params.append('condition', condition);
      if (make) params.append('make', make);
      if (departmentId) params.append('departmentId', departmentId);
      if (acquisitionSource) params.append('acquisitionSource', acquisitionSource);
      if (donorId) params.append('donorId', donorId);
      params.append('page', page);
      params.append('limit', limit);

      const res = await api.get(`/assets?${params.toString()}`);
      setAssets(res.data.data.assets);
      setPagination(res.data.data.pagination);
      setSummary(res.data.data.summary || []);
      setAcquisitionSummary(res.data.data.acquisitionSummary || []);
      if (res.data.data.makes && res.data.data.makes.length > 0) {
        setAvailableMakes(res.data.data.makes);
      }
    } catch (err) {
      console.error('Failed to load inventory assets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    api.get('/departments').then((res) => {
      setDepartments(res.data.data.departments || []);
    });
    api.get('/donors').then((res) => {
      setDonors(res.data.data.donors || []);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    fetchAssets();
  }, [debouncedSearch, status, condition, make, departmentId, acquisitionSource, donorId, page, limit]);

  // Clear selections when page or filters change
  useEffect(() => {
    setSelectedIds([]);
  }, [debouncedSearch, status, condition, make, departmentId, acquisitionSource, donorId, page, limit]);

  const handleCreateAsset = async (e) => {
    e.preventDefault();
    try {
      await api.post('/assets', {
        ...newAsset,
        departmentId: newAsset.departmentId ? Number(newAsset.departmentId) : null,
        donorId: newAsset.acquisitionSource === 'DONATED' && newAsset.donorId ? Number(newAsset.donorId) : null,
      });
      setCreateModalOpen(false);
      fetchAssets();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create asset');
    }
  };

  const handleExport = () => {
    downloadFile('/data/export/assets', 'SSISM_Laptops_Inventory.xlsx');
  };

  const handleDownloadTemplate = () => {
    downloadFile('/data/template/assets', 'SSISM_Laptops_Sample_Template.xlsx');
  };

  const handleToggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === assets.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(assets.map((a) => a.id));
    }
  };

  const handleExportSelected = () => {
    if (selectedIds.length === 0) return;
    downloadFile(`/data/export/assets?ids=${selectedIds.join(',')}`, `SSISM_Selected_Laptops_${selectedIds.length}.xlsx`);
  };

  const handlePrintSelected = () => {
    window.print();
  };

  const handleDeleteAsset = async (asset) => {
    if (
      !window.confirm(
        `Are you sure you want to permanently delete laptop '${asset.assetTag}' (${asset.model}) from the database?`
      )
    ) {
      return;
    }
    try {
      await api.delete(`/assets/${asset.id}`);
      fetchAssets();
      fetchDepartmentsAndDonors();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete asset.');
    }
  };

  const handleBulkDelete = async () => {
    if (
      !window.confirm(
        `Are you sure you want to permanently delete the ${selectedIds.length} selected laptop(s) from the database? This action cannot be undone.`
      )
    ) {
      return;
    }
    try {
      const res = await api.post('/assets/bulk-delete', { ids: selectedIds });
      alert(res.data.data?.message || 'Selected laptops deleted successfully.');
      setSelectedIds([]);
      fetchAssets();
      fetchDepartmentsAndDonors();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete selected assets.');
    }
  };


  // KPI Calculations
  const totalLaptops = summary.reduce((acc, curr) => acc + (curr._count?.status || 0), 0) || pagination.total;
  const inStockCount = summary.find((s) => s.status === 'AVAILABLE')?._count?.status || 0;
  const issuedCount = summary.find((s) => s.status === 'ISSUED')?._count?.status || 0;
  const maintenanceCount = summary.find((s) => s.status === 'UNDER_MAINTENANCE')?._count?.status || 0;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Laptop & Hardware Inventory</h1>
        </div>

        <div className="flex items-center space-x-2.5">
          <ColumnVisibilitySelector
            columns={INVENTORY_COLUMNS}
            visibleColumns={visibleColumns}
            onChange={setVisibleColumns}
            storageKey="col_pref_inventory"
          />

          <button
            onClick={handleDownloadTemplate}
            title="Download sample formatted Excel template for bulk import"
            className="px-3.5 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center space-x-1.5 transition shadow-2xs bg-white"
          >
            <FileSpreadsheet className="w-4 h-4 text-orange-600" />
            <span>Sample Excel</span>
          </button>

          <button
            onClick={handleExport}
            className="px-3.5 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center space-x-1.5 transition shadow-2xs bg-white"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Export Excel</span>
          </button>

          {isStaff && (
            <button
              onClick={() => setCreateModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-[#F26522] hover:bg-orange-600 text-white font-bold text-xs flex items-center space-x-1.5 transition shadow-md shadow-orange-500/25"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Laptop</span>
            </button>
          )}
        </div>
      </div>

      {/* Top KPI Metric Cards (Unified Master StatCard Design) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Laptops"
          value={totalLaptops}
          icon={Laptop}
          color="orange"
          active={status === ''}
          onClick={() => {
            setStatus('');
            setPage(1);
          }}
        />

        <StatCard
          title="In Stock"
          value={inStockCount}
          icon={CheckCircle}
          color="green"
          active={status === 'AVAILABLE'}
          onClick={() => {
            setStatus('AVAILABLE');
            setPage(1);
          }}
        />

        <StatCard
          title="Currently Issued"
          value={issuedCount}
          icon={Users}
          color="blue"
          active={status === 'ISSUED'}
          onClick={() => {
            setStatus('ISSUED');
            setPage(1);
          }}
        />

        <StatCard
          title="Maintenance"
          value={maintenanceCount}
          icon={Wrench}
          color="amber"
          active={status === 'UNDER_MAINTENANCE'}
          onClick={() => {
            setStatus('UNDER_MAINTENANCE');
            setPage(1);
          }}
        />
      </div>


      {/* Filter and Search Bar: Pure white container with rounded-xl */}
      <div className="relative z-20 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-2.5">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Tag, Serial, Model..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-[#F26522] focus:ring-2 focus:ring-orange-500/20 outline-none"
            />
          </div>

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
              { value: 'AVAILABLE', label: 'AVAILABLE (In Stock)' },
              { value: 'ISSUED', label: 'ISSUED (With Holder)' },
              { value: 'UNDER_MAINTENANCE', label: 'UNDER_MAINTENANCE' },
              { value: 'RETIRED', label: 'RETIRED' },
            ]}
          />

          {/* Condition Filter */}
          <CustomSelect
            value={condition}
            onChange={(val) => {
              setCondition(val);
              setPage(1);
            }}
            placeholder="All Conditions"
            options={[
              { value: '', label: 'All Conditions' },
              { value: 'BRAND_NEW', label: 'Brand New' },
              { value: 'GOOD', label: 'Good / Tested' },
              { value: 'SCRATCHES', label: 'Minor Scratches' },
              { value: 'DAMAGED', label: 'Damaged' },
            ]}
          />

          {/* Make Filter */}
          <CustomSelect
            value={make}
            onChange={(val) => {
              setMake(val);
              setPage(1);
            }}
            placeholder="All Brands"
            options={[
              { value: '', label: 'All Brands' },
              ...availableMakes.map((brand) => ({
                value: brand,
                label: brand,
              })),
            ]}
          />

          {/* Department Filter - STRICT SHORT CODES */}
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
          />

          {/* Acquisition Source Filter */}
          <CustomSelect
            value={acquisitionSource}
            onChange={(val) => {
              setAcquisitionSource(val);
              setPage(1);
            }}
            placeholder="All Sources"
            options={[
              { value: '', label: 'All Sources' },
              { value: 'PURCHASED', label: 'College Purchased' },
              { value: 'DONATED', label: 'Donated (CSR / Alumni)' },
            ]}
          />

          {/* Donor Filter */}
          <CustomSelect
            value={donorId}
            onChange={(val) => {
              setDonorId(val);
              setPage(1);
            }}
            placeholder="All Donors"
            options={[
              { value: '', label: 'All Donors' },
              ...donors.map((d) => ({
                value: d.id,
                label: d.name,
              })),
            ]}
          />
        </div>
      </div>

      {/* Main Inventory Table: Pure white container, rounded-xl, subtle border-slate-200 */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs font-medium">
            <div className="w-8 h-8 border-3 border-orange-200 border-t-[#F26522] rounded-full animate-spin mx-auto mb-2.5" />
            Loading campus asset registry...
          </div>
        ) : assets.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs font-medium">
            No laptop assets matched your selected filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10.5px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-2.5 px-3 w-8 text-center">
                    <input
                      type="checkbox"
                      aria-label="Select all laptops on this page"
                      checked={assets.length > 0 && selectedIds.length === assets.length}
                      onChange={handleSelectAll}
                      className="rounded border-slate-300 text-[#F26522] focus:ring-orange-500/20 cursor-pointer w-4 h-4"
                    />
                  </th>
                  {visibleColumns.includes('assetTag') && <th className="py-2.5 px-3">Asset Tag / Serial</th>}
                  {visibleColumns.includes('makeModel') && <th className="py-2.5 px-3">Make & Model</th>}
                  {visibleColumns.includes('source') && <th className="py-2.5 px-3">Source</th>}
                  {visibleColumns.includes('condition') && <th className="py-2.5 px-3">Condition</th>}
                  {visibleColumns.includes('status') && <th className="py-2.5 px-3">Status</th>}
                  {visibleColumns.includes('holder') && <th className="py-2.5 px-3">Current Holder</th>}
                  {visibleColumns.includes('actions') && (
                    <th className="py-2.5 px-3 text-right whitespace-nowrap">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {assets.map((asset) => {
                  const activeAlloc = asset.allocations?.[0];
                  const isSelected = selectedIds.includes(asset.id);
                  return (
                    <tr
                      key={asset.id}
                      onClick={() => setDrawerAsset(asset)}
                      className={`hover:bg-orange-50/25 transition-colors cursor-pointer ${
                        isSelected ? 'bg-orange-50/40' : ''
                      }`}
                    >
                      {/* Selection Checkbox */}
                      <td className="py-2.5 px-4 w-10 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          aria-label={`Select laptop ${asset.assetTag}`}
                          checked={isSelected}
                          onChange={() => handleToggleSelect(asset.id)}
                          className="rounded border-slate-300 text-[#F26522] focus:ring-orange-500/20 cursor-pointer w-4 h-4"
                        />
                      </td>

                      {/* Asset Tag & Serial */}
                      {visibleColumns.includes('assetTag') && (
                        <td className="py-2.5 px-4">
                          <div className="font-mono font-bold text-[#F26522] hover:underline">
                            {asset.assetTag}
                          </div>
                          <div className="font-mono text-[10px] text-slate-400">{asset.serialNumber}</div>
                        </td>
                      )}

                      {/* Make & Model */}
                      {visibleColumns.includes('makeModel') && (
                        <td className="py-2.5 px-4">
                          <div className="font-bold text-slate-800">{asset.make} {asset.model}</div>
                          <div className="text-[10px] text-slate-400">{asset.category}</div>
                        </td>
                      )}

                      {/* Source */}
                      {visibleColumns.includes('source') && (
                        <td className="py-2.5 px-4">
                          {asset.acquisitionSource === 'DONATED' ? (
                            <div className="flex flex-col items-start gap-0.5">
                              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                <Gift className="w-3 h-3 text-purple-600" />
                                <span>Donated</span>
                              </span>
                              {asset.donor && (
                                <span className="text-[9.5px] text-purple-600 font-medium truncate max-w-[120px]" title={asset.donor.name}>
                                  {asset.donor.name}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              <span>Purchased</span>
                            </span>
                          )}
                        </td>
                      )}

                      {/* Condition Badge */}
                      {visibleColumns.includes('condition') && (
                        <td className="py-2.5 px-4">
                          <Badge status={asset.condition} size="xs" />
                        </td>
                      )}

                      {/* Status Badge */}
                      {visibleColumns.includes('status') && (
                        <td className="py-2.5 px-4">
                          <Badge status={asset.status} size="xs" />
                        </td>
                      )}

                      {/* Holder */}
                      {visibleColumns.includes('holder') && (
                        <td className="py-2.5 px-4">
                          {activeAlloc ? (
                            <div>
                              <div className="font-bold text-slate-800">{activeAlloc.recipient.name}</div>
                              <div className="text-[10px] text-slate-500 font-mono">
                                {activeAlloc.recipient.rollNumberOrEmpId} ({activeAlloc.recipient.department?.code || activeAlloc.recipient.role})
                              </div>
                            </div>
                          ) : (
                            <span className="text-[10.5px] text-slate-400 italic">In Stock</span>
                          )}
                        </td>
                      )}

                      {/* Actions */}
                      {visibleColumns.includes('actions') && (
                        <td className="py-2.5 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end space-x-1.5 flex-nowrap">
                            <button
                              onClick={() => setDrawerAsset(asset)}
                              title="Inspect Complete Specifications & History"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-[#F26522] hover:bg-orange-50 transition"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {isStaff && asset.status === 'AVAILABLE' && (
                              <button
                                onClick={() => setAllocateAsset(asset)}
                                title="Allocate to Student / Faculty"
                                className="px-2.5 py-1 rounded-lg bg-[#F26522] hover:bg-orange-600 text-white font-bold text-[11px] shadow-xs transition"
                              >
                                + Issue
                              </button>
                            )}

                            {isStaff && (
                              <button
                                onClick={() => setMaintenanceAsset(asset)}
                                title="Log Hardware Upgrade or Repair"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition"
                              >
                                <Wrench className="w-4 h-4" />
                              </button>
                            )}

                            {isStaff && asset.status !== 'ISSUED' && (
                              <button
                                onClick={() => handleDeleteAsset(asset)}
                                title="Delete Laptop from Database"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
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
          itemName="laptops"
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
            <span>Export Selected</span>
          </button>

          <button
            onClick={handlePrintSelected}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center space-x-1.5 transition border border-slate-600"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Selected</span>
          </button>

          {isStaff && (
            <button
              onClick={handleBulkDelete}
              className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center space-x-1.5 transition shadow-sm"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Selected</span>
            </button>
          )}

          <button
            onClick={() => setSelectedIds([])}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
            title="Clear Selection"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Allocate Modal */}
      <AllocateModal
        isOpen={!!allocateAsset}
        onClose={() => setAllocateAsset(null)}
        selectedAsset={allocateAsset}
        onSuccess={(alloc) => {
          fetchAssets();
          setActiveReceipt(alloc);
        }}
      />

      {/* Maintenance Modal */}
      <AddMaintenanceModal
        isOpen={!!maintenanceAsset}
        onClose={() => setMaintenanceAsset(null)}
        asset={maintenanceAsset}
        onSuccess={() => fetchAssets()}
      />

      {/* Receipt Modal */}
      <ReceiptModal
        isOpen={!!activeReceipt}
        onClose={() => setActiveReceipt(null)}
        allocation={activeReceipt}
      />

      {/* Register New Asset Modal */}
      <Modal isOpen={createModalOpen} onClose={() => setCreateModalOpen(false)} title="Register New Campus Laptop" maxWidth="max-w-2xl">
        <form onSubmit={handleCreateAsset} className="space-y-3.5 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 uppercase text-[10.5px]">Asset Tag ID *</label>
              <input
                type="text"
                placeholder="e.g. LP/2025/001"
                required
                value={newAsset.assetTag}
                onChange={(e) => setNewAsset({ ...newAsset, assetTag: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-[#F26522]"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 uppercase text-[10.5px]">Serial Number *</label>
              <input
                type="text"
                placeholder="e.g. SN-DELL-94812"
                required
                value={newAsset.serialNumber}
                onChange={(e) => setNewAsset({ ...newAsset, serialNumber: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-[#F26522]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 uppercase text-[10.5px]">Brand / Make *</label>
              <input
                type="text"
                required
                value={newAsset.make}
                onChange={(e) => setNewAsset({ ...newAsset, make: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-[#F26522]"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 uppercase text-[10.5px]">Model *</label>
              <input
                type="text"
                placeholder="e.g. Latitude 3420"
                required
                value={newAsset.model}
                onChange={(e) => setNewAsset({ ...newAsset, model: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-[#F26522]"
              />
            </div>
          </div>

          {/* Acquisition Source & Conditional Donor */}
          <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <div>
              <label className="font-bold text-slate-700 uppercase text-[10.5px]">Acquisition Source *</label>
              <select
                value={newAsset.acquisitionSource}
                onChange={(e) => setNewAsset({ ...newAsset, acquisitionSource: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-[#F26522] bg-white"
              >
                <option value="PURCHASED">College Purchased</option>
                <option value="DONATED">Donated (CSR / Alumni / Partner)</option>
              </select>
            </div>
            <div>
              <label className="font-bold text-slate-700 uppercase text-[10.5px]">
                Donor / Partner {newAsset.acquisitionSource === 'DONATED' && '*'}
              </label>
              <select
                disabled={newAsset.acquisitionSource !== 'DONATED'}
                value={newAsset.donorId}
                onChange={(e) => setNewAsset({ ...newAsset, donorId: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-[#F26522] bg-white disabled:bg-slate-100 disabled:cursor-not-allowed"
              >
                <option value="">-- Select Registered Donor --</option>
                {donors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} {d.organization ? `(${d.organization})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Processor, Generation, RAM, Storage */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="font-bold text-slate-700 uppercase text-[10.5px]">Processor</label>
              <input
                type="text"
                value={newAsset.processor}
                onChange={(e) => setNewAsset({ ...newAsset, processor: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-[#F26522]"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 uppercase text-[10.5px]">Generation</label>
              <input
                type="text"
                placeholder="e.g. 11th Gen"
                value={newAsset.generation}
                onChange={(e) => setNewAsset({ ...newAsset, generation: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-[#F26522]"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 uppercase text-[10.5px]">RAM</label>
              <input
                type="text"
                value={newAsset.ram}
                onChange={(e) => setNewAsset({ ...newAsset, ram: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-[#F26522]"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 uppercase text-[10.5px]">Storage</label>
              <input
                type="text"
                value={newAsset.storage}
                onChange={(e) => setNewAsset({ ...newAsset, storage: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-[#F26522]"
              />
            </div>
          </div>

          {/* Display Size, Color, Charger, Department */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="font-bold text-slate-700 uppercase text-[10.5px]">Display Size</label>
              <input
                type="text"
                placeholder="e.g. 14 inch"
                value={newAsset.displaySize}
                onChange={(e) => setNewAsset({ ...newAsset, displaySize: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-[#F26522]"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 uppercase text-[10.5px]">Color</label>
              <input
                type="text"
                placeholder="e.g. Platinum Silver"
                value={newAsset.color}
                onChange={(e) => setNewAsset({ ...newAsset, color: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-[#F26522]"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 uppercase text-[10.5px]">Charger Serial</label>
              <input
                type="text"
                placeholder="e.g. CHG-94812"
                value={newAsset.chargerSerial}
                onChange={(e) => setNewAsset({ ...newAsset, chargerSerial: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-[#F26522]"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 uppercase text-[10.5px]">Department</label>
              <select
                value={newAsset.departmentId}
                onChange={(e) => setNewAsset({ ...newAsset, departmentId: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-[#F26522] bg-white font-mono"
              >
                <option value="">-- General Campus --</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.code}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Remarks */}
          <div>
            <label className="font-bold text-slate-700 uppercase text-[10.5px]">Remarks / Notes</label>
            <textarea
              rows={2}
              placeholder="e.g. Donated under CSR 2025 initiative for CSE lab setup..."
              value={newAsset.remarks}
              onChange={(e) => setNewAsset({ ...newAsset, remarks: e.target.value })}
              className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-[#F26522] resize-none"
            />
          </div>

          <div className="flex items-center space-x-6 pt-1.5">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={newAsset.hasBag}
                onChange={(e) => setNewAsset({ ...newAsset, hasBag: e.target.checked })}
                className="rounded text-[#F26522] focus:ring-[#F26522]"
              />
              <span>Includes Laptop Bag</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={newAsset.hasMouse}
                onChange={(e) => setNewAsset({ ...newAsset, hasMouse: e.target.checked })}
                className="rounded text-[#F26522] focus:ring-[#F26522]"
              />
              <span>Includes External Mouse</span>
            </label>
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-[#F26522] hover:bg-orange-600 text-white font-bold shadow-md shadow-orange-500/20"
            >
              + Add Laptop
            </button>
          </div>
        </form>
      </Modal>

      {/* Asset Slide-Over Drawer */}
      <AssetDrawer
        isOpen={!!drawerAsset}
        onClose={() => setDrawerAsset(null)}
        asset={drawerAsset}
        onIssue={(asset) => setAllocateAsset(asset)}
        onMaintenance={(asset) => setMaintenanceAsset(asset)}
      />
    </div>
  );
};
