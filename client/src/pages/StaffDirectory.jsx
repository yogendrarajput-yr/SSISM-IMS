import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { CustomSelect } from '../components/common/CustomSelect';
import { UserDrawer } from '../components/users/UserDrawer';
import { StatCard } from '../components/common/StatCard';
import { Pagination } from '../components/common/Pagination';
import { ColumnVisibilitySelector } from '../components/common/ColumnVisibilitySelector';
import { useAuth } from '../context/AuthContext';
import {
  UserCheck,
  Search,
  Plus,
  FileSpreadsheet,
  Download,
  Upload,
  Eye,
  Edit2,
  Archive,
  Laptop,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Building,
  Trash2,
} from 'lucide-react';

const STAFF_COLUMNS = [
  { key: 'select', label: 'Select', required: true },
  { key: 'empId', label: 'Emp ID', required: true },
  { key: 'name', label: 'Staff Name', required: true },
  { key: 'department', label: 'Department' },
  { key: 'role', label: 'Role / Designation' },
  { key: 'mobile', label: 'Mobile' },
  { key: 'email', label: 'Email' },
  { key: 'laptop', label: 'Laptop Custody' },
  { key: 'actions', label: 'Actions', required: true },
];

export const StaffDirectory = ({ hideTitle = false }) => {
  const { isStaff, isSuperAdmin } = useAuth();

  // Data & Pagination
  const [staffList, setStaffList] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [metrics, setMetrics] = useState({
    totalStaff: 0,
    holdingLaptop: 0,
  });
  const [pagination, setPagination] = useState({ page: 1, limit: 15, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);

  const [visibleColumns, setVisibleColumns] = useState(() => {
    try {
      const saved = localStorage.getItem('col_pref_staff');
      return saved ? JSON.parse(saved) : STAFF_COLUMNS.map((c) => c.key);
    } catch {
      return STAFF_COLUMNS.map((c) => c.key);
    }
  });

  // Filters State
  const [search, setSearch] = useState('');
  const [departmentId, setDepartmentId] = useState('ALL');
  const [custodyStatus, setCustodyStatus] = useState('ALL');

  // Selection & Drawer State
  const [selectedIds, setSelectedIds] = useState([]);
  const [drawerUser, setDrawerUser] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Add / Edit Modal State
  const [staffModalOpen, setStaffModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [staffForm, setStaffForm] = useState({
    name: '',
    departmentId: '',
    designation: 'Assistant Professor',
    aadhaarNumber: '',
    phone: '',
    email: '',
    employeeId: '',
    role: 'STAFF',
    address: '',
  });

  // Bulk Import Modal State
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importErrors, setImportErrors] = useState([]);

  // Load departments for dropdown
  useEffect(() => {
    const fetchDepts = async () => {
      try {
        const res = await api.get('/departments');
        setDepartments(res.data.data.departments || []);
      } catch (err) {
        console.error('Failed to load departments:', err);
      }
    };
    fetchDepts();
  }, []);

  // Fetch Staff Directory
  const fetchStaff = async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
      };

      if (search.trim()) params.search = search.trim();
      if (departmentId !== 'ALL') params.departmentId = departmentId;
      if (custodyStatus !== 'ALL') params.custodyStatus = custodyStatus;

      const res = await api.get('/users/staff', { params });
      setStaffList(res.data.data.staff || []);
      setMetrics(res.data.data.metrics || {});
      setPagination((prev) => ({
        ...prev,
        total: res.data.data.total || 0,
        totalPages: res.data.data.pagination?.totalPages || 1,
      }));
    } catch (err) {
      console.error('Failed to load staff:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, [pagination.page, pagination.limit, departmentId, custodyStatus]);

  // Debounced search
  useEffect(() => {
    const handler = setTimeout(() => {
      setPagination((p) => ({ ...p, page: 1 }));
      fetchStaff();
    }, 350);
    return () => clearTimeout(handler);
  }, [search]);

  // Select all handler
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(staffList.map((s) => s.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Add / Edit Modal Triggers
  const handleOpenAddModal = () => {
    setEditingStaff(null);
    setStaffForm({
      name: '',
      departmentId: departments[0]?.id || '',
      designation: 'Assistant Professor',
      aadhaarNumber: '',
      phone: '',
      email: '',
      employeeId: '',
      role: 'FACULTY',
      address: '',
    });
    setStaffModalOpen(true);
  };

  const handleOpenEditModal = (st) => {
    setEditingStaff(st);
    setStaffForm({
      name: st.name || '',
      departmentId: st.departmentId || '',
      designation: st.designation || '',
      aadhaarNumber: st.aadhaarNumber || '',
      phone: st.phone || '',
      email: st.email || '',
      employeeId: st.rollNumberOrEmpId || '',
      role: st.role || 'STAFF',
      address: st.address || '',
    });
    setStaffModalOpen(true);
  };

  const handleSaveStaff = async (e) => {
    e.preventDefault();
    try {
      if (editingStaff) {
        await api.put(`/users/${editingStaff.id}`, staffForm);
      } else {
        await api.post('/users/staff', staffForm);
      }
      setStaffModalOpen(false);
      fetchStaff();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save staff record.');
    }
  };

  // Single Archive with Active Constraint Lock Notice
  const handleArchiveStaff = async (st) => {
    const isHolding = st.receivedAllocations?.some((a) => a.status === 'ACTIVE');
    if (isHolding) {
      alert(
        `Active Constraint Lock Enforced:\n\nCannot archive staff member '${st.name}' (${st.rollNumberOrEmpId}) because they currently hold an active issued laptop.\n\nPlease accept laptop return before archiving.`
      );
      return;
    }

    if (
      !window.confirm(
        `Are you sure you want to archive staff member '${st.name}' (${st.rollNumberOrEmpId})?\n\nThis record will be moved to the Soft-Delete Archive.`
      )
    ) {
      return;
    }

    try {
      await api.patch(`/users/${st.id}/archive`);
      if (drawerOpen && drawerUser?.id === st.id) setDrawerOpen(false);
      fetchStaff();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to archive staff.');
    }
  };

  // Bulk Archive
  const handleBulkArchive = async () => {
    if (selectedIds.length === 0) return;
    if (
      !window.confirm(
        `Are you sure you want to archive ${selectedIds.length} selected staff members?\n\nRecords will be moved to the Soft-Delete Archive.`
      )
    ) {
      return;
    }

    try {
      await api.post('/users/bulk-archive', { ids: selectedIds });
      setSelectedIds([]);
      fetchStaff();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to archive selected staff.');
    }
  };

  // Permanently Delete Single Staff Member
  const handleDeleteStaff = async (st) => {
    if (
      !window.confirm(
        `Are you sure you want to permanently delete staff member '${st.name}' (${st.rollNumberOrEmpId}) from the database? This action cannot be undone.`
      )
    ) {
      return;
    }
    try {
      await api.delete(`/users/${st.id}`);
      fetchStaff();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete staff member.');
    }
  };

  // Bulk Permanently Delete Staff
  const handleBulkDelete = async () => {
    if (
      !window.confirm(
        `Are you sure you want to permanently delete the ${selectedIds.length} selected staff member(s) from the database? This cannot be undone.`
      )
    ) {
      return;
    }
    try {
      const res = await api.post('/users/bulk-delete', { ids: selectedIds });
      alert(res.data.data?.message || 'Selected staff members permanently deleted.');
      setSelectedIds([]);
      fetchStaff();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete selected staff members.');
    }
  };


  // Bulk Import
  const handleImportSubmit = async (e) => {
    e.preventDefault();
    if (!importFile) {
      alert('Please select an Excel or CSV file to import.');
      return;
    }

    const formData = new FormData();
    formData.append('file', importFile);

    setImportLoading(true);
    setImportErrors([]);
    try {
      const res = await api.post('/users/staff/bulk-import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data.skippedCount > 0) {
        setImportErrors(res.data.errors || []);
        alert(
          `Import finished with warnings:\nSuccessfully imported: ${res.data.importedCount}\nSkipped: ${res.data.skippedCount}`
        );
      } else {
        alert(`Successfully imported ${res.data.importedCount} staff & faculty records!`);
        setImportModalOpen(false);
      }
      fetchStaff();
    } catch (err) {
      alert(err.response?.data?.message || 'Import failed. Check file format.');
    } finally {
      setImportLoading(false);
    }
  };

  // Download Sample Template
  const handleDownloadTemplate = () => {
    window.location.href = `${api.defaults.baseURL}/users/staff/template`;
  };

  // Export Full Directory
  const handleExportDirectory = () => {
    window.location.href = `${api.defaults.baseURL}/users/export?role=STAFF`;
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {!hideTitle ? (
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2.5">
              <UserCheck className="w-7 h-7 text-[#F26522]" />
              <span>Staff & Faculty Directory</span>
            </h1>
          </div>
        ) : (
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Verified Faculty & Staff Custody Registry
          </div>
        )}

        <div className="flex items-center space-x-2.5">
          <ColumnVisibilitySelector
            columns={STAFF_COLUMNS}
            visibleColumns={visibleColumns}
            onChange={setVisibleColumns}
            storageKey="col_pref_staff"
          />

          <button
            onClick={handleExportDirectory}
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs flex items-center space-x-1.5 transition shadow-xs"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Export Excel</span>
          </button>

          {isStaff && (
            <>
              <button
                onClick={() => {
                  setImportFile(null);
                  setImportErrors([]);
                  setImportModalOpen(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs flex items-center space-x-1.5 transition shadow-xs"
              >
                <Upload className="w-4 h-4 text-slate-500" />
                <span>Bulk Import</span>
              </button>

              <button
                onClick={handleOpenAddModal}
                className="px-4 py-2 rounded-xl bg-[#F26522] hover:bg-orange-600 text-white font-bold text-xs flex items-center space-x-1.5 transition shadow-md shadow-orange-500/20 ring-1 ring-orange-500"
              >
                <Plus className="w-4 h-4" />
                <span>Add Staff</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Metric Stat Cards (Unified Master StatCard Design) */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="Active Staff & Faculty"
          value={metrics.totalStaff || 0}
          icon={UserCheck}
          color="blue"
        />

        <StatCard
          title="Holding Issued Laptop"
          value={metrics.holdingLaptop || 0}
          icon={Laptop}
          color="green"
          active={custodyStatus === 'ISSUED'}
          onClick={() => {
            setCustodyStatus(custodyStatus === 'ISSUED' ? 'ALL' : 'ISSUED');
            setPagination((p) => ({ ...p, page: 1 }));
          }}
        />

        <StatCard
          title="Academic Departments"
          value={departments.length}
          icon={Building}
          color="purple"
        />
      </div>

      {/* Filter Toolbar with CustomSelect */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Keyword Search */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Name, Emp ID, Aadhaar, Role, Email..."
              className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#F26522]/30 focus:border-[#F26522] transition"
            />
          </div>

          {/* Department Filter */}
          <div className="w-56">
            <CustomSelect
              value={departmentId}
              onChange={setDepartmentId}
              options={[
                { value: 'ALL', label: 'All Departments' },
                ...departments.map((d) => ({ value: String(d.id), label: d.name || d.code })),
              ]}
              placeholder="Department"
            />
          </div>

          {/* Custody Filter */}
          <div className="w-40">
            <CustomSelect
              value={custodyStatus}
              onChange={setCustodyStatus}
              options={[
                { value: 'ALL', label: 'All Custody' },
                { value: 'ISSUED', label: 'Holding Laptop' },
                { value: 'AVAILABLE', label: 'No Laptop' },
              ]}
              placeholder="Custody"
            />
          </div>

          {/* Reset Filters */}
          <button
            onClick={() => {
              setSearch('');
              setDepartmentId('ALL');
              setCustodyStatus('ALL');
            }}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition"
            title="Reset Filters"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Compact Staff Data Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[10.5px] font-bold text-slate-500 uppercase tracking-wider">
                {visibleColumns.includes('select') && (
                  <th className="py-2.5 px-2 w-8 text-center">
                    <input
                      type="checkbox"
                      checked={staffList.length > 0 && selectedIds.length === staffList.length}
                      onChange={handleSelectAll}
                      className="rounded border-slate-300 text-[#F26522] focus:ring-[#F26522]"
                    />
                  </th>
                )}
                {visibleColumns.includes('empId') && <th className="py-2.5 px-2">Emp ID</th>}
                {visibleColumns.includes('name') && <th className="py-2.5 px-2">Staff Name</th>}
                {visibleColumns.includes('department') && <th className="py-2.5 px-2">Department</th>}
                {visibleColumns.includes('role') && <th className="py-2.5 px-2">Role / Designation</th>}
                {visibleColumns.includes('mobile') && <th className="py-2.5 px-2">Mobile</th>}
                {visibleColumns.includes('email') && <th className="py-2.5 px-2">Email</th>}
                {visibleColumns.includes('laptop') && <th className="py-2.5 px-2">Laptop</th>}
                {visibleColumns.includes('actions') && (
                  <th className="py-2.5 px-2 text-right whitespace-nowrap">Actions</th>
                )}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={visibleColumns.length} className="py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="w-6 h-6 border-2 border-[#F26522] border-t-transparent rounded-full animate-spin" />
                      <span className="font-bold">Loading staff directory...</span>
                    </div>
                  </td>
                </tr>
              ) : staffList.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumns.length} className="py-16 text-center text-slate-400 font-medium">
                    No staff records match the current criteria.
                  </td>
                </tr>
              ) : (
                staffList.map((st) => {
                  const activeAlloc = st.receivedAllocations?.find((a) => a.status === 'ACTIVE');
                  const isHolding = Boolean(activeAlloc);

                  return (
                    <tr
                      key={st.id}
                      onClick={() => {
                        setDrawerUser(st);
                        setDrawerOpen(true);
                      }}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors duration-100"
                    >
                      {/* Checkbox */}
                      {visibleColumns.includes('select') && (
                        <td
                          onClick={(e) => e.stopPropagation()}
                          className="py-2 px-2 text-center"
                        >
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(st.id)}
                            onChange={() => handleSelectOne(st.id)}
                            className="rounded border-slate-300 text-[#F26522] focus:ring-[#F26522]"
                          />
                        </td>
                      )}

                      {/* Employee ID */}
                      {visibleColumns.includes('empId') && (
                        <td className="py-2 px-2 font-mono font-bold text-slate-900">
                          {st.rollNumberOrEmpId}
                        </td>
                      )}

                      {/* Staff Name & Avatar */}
                      {visibleColumns.includes('name') && (
                        <td className="py-2 px-2">
                          <div className="flex items-center space-x-2">
                            <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-extrabold text-[9.5px] flex items-center justify-center shrink-0">
                              {st.name[0]}
                            </div>
                            <span className="font-bold text-slate-800">{st.name}</span>
                          </div>
                        </td>
                      )}

                      {/* Department */}
                      {visibleColumns.includes('department') && (
                        <td className="py-2 px-2">
                          <Badge variant="purple" size="xs">
                            {st.department?.name || st.department?.code || 'Campus'}
                          </Badge>
                        </td>
                      )}

                      {/* Designation */}
                      {visibleColumns.includes('role') && (
                        <td className="py-2 px-2 text-slate-700 font-medium">
                          {st.designation || st.role}
                        </td>
                      )}

                      {/* Mobile */}
                      {visibleColumns.includes('mobile') && (
                        <td className="py-2 px-2 text-slate-500 font-medium">
                          {st.phone || '—'}
                        </td>
                      )}

                      {/* Email */}
                      {visibleColumns.includes('email') && (
                        <td className="py-2 px-2 text-slate-600 font-medium truncate max-w-[150px]">
                          {st.email}
                        </td>
                      )}

                      {/* Laptop Custody */}
                      {visibleColumns.includes('laptop') && (
                        <td className="py-2 px-2">
                          {isHolding ? (
                            <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono font-bold text-[10.5px]">
                              <Laptop className="w-3 h-3 text-emerald-600" />
                              <span>{activeAlloc.asset?.assetTag}</span>
                            </span>
                          ) : (
                            <span className="text-[10.5px] text-slate-400 font-medium">None</span>
                          )}
                        </td>
                      )}

                      {/* Actions */}
                      {visibleColumns.includes('actions') && (
                        <td
                          onClick={(e) => e.stopPropagation()}
                          className="py-2 px-2 text-right space-x-1 whitespace-nowrap"
                        >
                          <button
                            onClick={() => {
                              setDrawerUser(st);
                              setDrawerOpen(true);
                            }}
                            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition"
                            title="View Profile Drawer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {isStaff && (
                            <>
                              <button
                                onClick={() => handleOpenEditModal(st)}
                                className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                title="Edit Staff Member"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => handleArchiveStaff(st)}
                                className="p-1 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                                title="Archive Staff Member (Soft-Delete)"
                              >
                                <Archive className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => handleDeleteStaff(st)}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                title="Permanently Delete Staff Member from Database"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Universal Pagination Toolbar with Limit Selector */}
        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          total={pagination.total}
          limit={pagination.limit}
          onPageChange={(newPage) => setPagination((p) => ({ ...p, page: newPage }))}
          onLimitChange={(newLimit) => setPagination((p) => ({ ...p, limit: newLimit, page: 1 }))}
          itemName="staff & faculty"
        />
      </div>

      {/* Floating Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40 bg-slate-900/90 backdrop-blur-md text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center space-x-4 border border-slate-700 animate-in fade-in slide-in-from-bottom-3">
          <span className="text-xs font-bold text-orange-400">
            {selectedIds.length} {selectedIds.length === 1 ? 'member' : 'members'} selected
          </span>

          <div className="h-4 w-px bg-slate-700" />

          <button
            onClick={handleBulkArchive}
            className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center space-x-1 transition"
          >
            <Archive className="w-3.5 h-3.5" />
            <span>Archive Selected</span>
          </button>

          <button
            onClick={handleBulkDelete}
            className="text-xs font-bold text-rose-400 hover:text-rose-300 flex items-center space-x-1 transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Selected</span>
          </button>

          <button
            onClick={() => setSelectedIds([])}
            className="text-xs text-slate-400 hover:text-white transition"
          >
            Deselect All
          </button>
        </div>
      )}

      {/* Slide-over Profile Drawer */}
      <UserDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        userId={drawerUser?.id}
        initialUser={drawerUser}
        onEdit={(st) => handleOpenEditModal(st)}
        onArchive={(st) => handleArchiveStaff(st)}
      />

      {/* Add / Edit Staff Modal */}
      <Modal
        isOpen={staffModalOpen}
        onClose={() => setStaffModalOpen(false)}
        title={editingStaff ? 'Edit Staff Member' : 'Register Single Staff / Faculty'}
      >
        <form onSubmit={handleSaveStaff} className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-xs">
            {/* Staff Name */}
            <div className="col-span-2">
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={staffForm.name}
                onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })}
                placeholder="e.g., Prof. Manish Joshi"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#F26522]/30 focus:border-[#F26522] outline-none"
              />
            </div>

            {/* Employee ID */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Employee ID (Unique Key) *
              </label>
              <input
                type="text"
                required
                value={staffForm.employeeId}
                onChange={(e) => setStaffForm({ ...staffForm, employeeId: e.target.value })}
                placeholder="e.g., EMP-FAC-201"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:ring-2 focus:ring-[#F26522]/30 focus:border-[#F26522] outline-none"
              />
            </div>

            {/* Department */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Department *
              </label>
              <select
                value={staffForm.departmentId}
                onChange={(e) => setStaffForm({ ...staffForm, departmentId: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#F26522]/30 focus:border-[#F26522] outline-none"
              >
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.code} - {d.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Current Role / Designation */}
            <div className="col-span-2">
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Current Role / Designation *
              </label>
              <input
                type="text"
                required
                value={staffForm.designation}
                onChange={(e) => setStaffForm({ ...staffForm, designation: e.target.value })}
                placeholder="e.g., Associate Professor & HOD"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#F26522]/30 focus:border-[#F26522] outline-none"
              />
            </div>

            {/* Aadhaar Number */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Aadhaar Number (Unique)
              </label>
              <input
                type="text"
                value={staffForm.aadhaarNumber}
                onChange={(e) => setStaffForm({ ...staffForm, aadhaarNumber: e.target.value })}
                placeholder="e.g., 9876-5432-1234"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:ring-2 focus:ring-[#F26522]/30 focus:border-[#F26522] outline-none"
              />
            </div>

            {/* Role Tier */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Access Tier / Role
              </label>
              <select
                value={staffForm.role}
                onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#F26522]/30 focus:border-[#F26522] outline-none"
              >
                <option value="FACULTY">FACULTY (Professor / Instructor)</option>
                <option value="STAFF">STAFF (Lab Tech / Inventory Manager)</option>
                <option value="HIGHER_MANAGEMENT">HIGHER MANAGEMENT (Dean / Auditor)</option>
                <option value="SUPER_ADMIN">SUPER ADMIN (System Administrator)</option>
              </select>
            </div>

            {/* Mobile Number */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Mobile Number
              </label>
              <input
                type="text"
                value={staffForm.phone}
                onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })}
                placeholder="+91 98765 43210"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#F26522]/30 focus:border-[#F26522] outline-none"
              />
            </div>

            {/* Email ID */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Email ID (Campus Login) *
              </label>
              <input
                type="email"
                required
                value={staffForm.email}
                onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                placeholder="faculty.name@ssism.edu"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#F26522]/30 focus:border-[#F26522] outline-none"
              />
            </div>

            {/* Address */}
            <div className="col-span-2">
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Residential Address / Campus Quarters
              </label>
              <input
                type="text"
                value={staffForm.address}
                onChange={(e) => setStaffForm({ ...staffForm, address: e.target.value })}
                placeholder="Staff Quarters Type-IV, SSISM Campus"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#F26522]/30 focus:border-[#F26522] outline-none"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={() => setStaffModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-[#F26522] hover:bg-orange-600 text-white font-bold text-xs transition shadow-md shadow-orange-500/20"
            >
              {editingStaff ? 'Save Changes' : 'Register Staff Member'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Bulk Import Modal */}
      <Modal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        title="Bulk Import Staff & Faculty (Excel / CSV)"
      >
        <form onSubmit={handleImportSubmit} className="space-y-4">
          <p className="text-xs text-slate-600">
            Upload an Excel (.xlsx) or CSV file with staff and faculty personnel details. Employee IDs, email addresses, and Aadhaar numbers will be verified for uniqueness.
          </p>

          <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-between">
            <div className="flex items-center space-x-2 text-xs text-blue-900">
              <FileSpreadsheet className="w-5 h-5 text-blue-600" />
              <span>Need the standard template?</span>
            </div>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="px-3 py-1.5 rounded-lg bg-white border border-blue-200 text-blue-700 font-bold text-xs hover:bg-blue-100 transition shadow-xs flex items-center space-x-1"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Sample (.xlsx)</span>
            </button>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Select Spreadsheet File (.xlsx or .csv)
            </label>
            <input
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={(e) => setImportFile(e.target.files[0] || null)}
              className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
            />
          </div>

          {importErrors.length > 0 && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl space-y-1">
              <span className="text-xs font-bold text-red-800 flex items-center space-x-1">
                <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                <span>Import Warnings / Skipped Rows:</span>
              </span>
              <ul className="text-[11px] text-red-700 list-disc list-inside max-h-32 overflow-y-auto space-y-0.5">
                {importErrors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="pt-3 border-t border-slate-200 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={() => setImportModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={importLoading || !importFile}
              className="px-4 py-2 rounded-xl bg-[#F26522] hover:bg-orange-600 text-white font-bold text-xs transition disabled:opacity-50 shadow-md shadow-orange-500/20 flex items-center space-x-1.5"
            >
              {importLoading && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              <span>{importLoading ? 'Importing...' : 'Upload & Import'}</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
