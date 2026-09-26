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
  Users,
  Search,
  Plus,
  FileSpreadsheet,
  Download,
  Upload,
  Eye,
  Edit2,
  Archive,
  Laptop,
  AlertTriangle,
  RefreshCw,
  Trash2,
  CheckCircle,
} from 'lucide-react';

const STUDENT_COLUMNS = [
  { key: 'select', label: 'Select', required: true },
  { key: 'rollNo', label: 'Roll No', required: true },
  { key: 'name', label: 'Student Name', required: true },
  { key: 'fatherName', label: 'Father Name' },
  { key: 'branch', label: 'Branch' },
  { key: 'batch', label: 'Batch' },
  { key: 'track', label: 'Track' },
  { key: 'laptop', label: 'Laptop Custody' },
  { key: 'fee', label: 'Fee Clearance' },
  { key: 'actions', label: 'Actions', required: true },
];

export const Students = ({ hideTitle = false }) => {
  const { isStaff } = useAuth();

  // Data & Pagination
  const [students, setStudents] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [availableBatches, setAvailableBatches] = useState([]);
  const [availableTracks, setAvailableTracks] = useState([]);
  const [metrics, setMetrics] = useState({
    totalActiveStudents: 0,
    holdingLaptop: 0,
    feeCleared: 0,
    feeOverdue: 0,
  });
  const [pagination, setPagination] = useState({ page: 1, limit: 15, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);

  const [visibleColumns, setVisibleColumns] = useState(() => {
    try {
      const saved = localStorage.getItem('col_pref_students');
      return saved ? JSON.parse(saved) : STUDENT_COLUMNS.map((c) => c.key);
    } catch {
      return STUDENT_COLUMNS.map((c) => c.key);
    }
  });

  // Filters State
  const [search, setSearch] = useState('');
  const [branch, setBranch] = useState('ALL');
  const [batchYear, setBatchYear] = useState('ALL');
  const [track, setTrack] = useState('ALL');
  const [custodyStatus, setCustodyStatus] = useState('ALL');
  const [feeStatus, setFeeStatus] = useState('ALL');

  // Selection & Drawer State
  const [selectedIds, setSelectedIds] = useState([]);
  const [drawerUser, setDrawerUser] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Add / Edit Modal State
  const [studentModalOpen, setStudentModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [studentForm, setStudentForm] = useState({
    name: '',
    fatherName: '',
    rollNumber: '',
    aadhaarNumber: '',
    branch: '',
    batchYear: '2024-2028',
    track: 'Full Stack Development',
    phone: '',
    email: '',
    address: '',
    feeStatus: 'PAID',
    feeAmount: 1500,
  });

  // Fetch departments for dynamic dropdowns
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

  // Bulk Import Modal State
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importErrors, setImportErrors] = useState([]);

  // Fetch Student Directory
  const fetchStudents = async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
      };

      if (search.trim()) params.search = search.trim();
      if (branch !== 'ALL') params.branch = branch;
      if (batchYear !== 'ALL') params.batchYear = batchYear;
      if (track !== 'ALL') params.track = track;
      if (custodyStatus !== 'ALL') params.custodyStatus = custodyStatus;
      if (feeStatus !== 'ALL') params.feeStatus = feeStatus;

      const res = await api.get('/users/students', { params });
      setStudents(res.data.data.students || []);
      setMetrics(res.data.data.metrics || {});
      if (res.data.data.filters?.batches) setAvailableBatches(res.data.data.filters.batches);
      if (res.data.data.filters?.tracks) setAvailableTracks(res.data.data.filters.tracks);
      setPagination((prev) => ({
        ...prev,
        total: res.data.data.total || 0,
        totalPages: res.data.data.pagination?.totalPages || 1,
      }));
    } catch (err) {
      console.error('Failed to load students:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [pagination.page, pagination.limit, branch, batchYear, track, custodyStatus, feeStatus]);

  // Debounced search
  useEffect(() => {
    const handler = setTimeout(() => {
      setPagination((p) => ({ ...p, page: 1 }));
      fetchStudents();
    }, 350);
    return () => clearTimeout(handler);
  }, [search]);

  // Select all handler
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(students.map((s) => s.id));
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
    setEditingStudent(null);
    setStudentForm({
      name: '',
      fatherName: '',
      rollNumber: '',
      aadhaarNumber: '',
      branch: departments[0]?.name || '',
      batchYear: '2024-2028',
      track: 'Full Stack Development',
      phone: '',
      email: '',
      address: '',
      feeStatus: 'PAID',
      feeAmount: 1500,
    });
    setStudentModalOpen(true);
  };

  const handleOpenEditModal = (st) => {
    setEditingStudent(st);
    setStudentForm({
      name: st.name || '',
      fatherName: st.fatherName || '',
      rollNumber: st.rollNumberOrEmpId || '',
      aadhaarNumber: st.aadhaarNumber || '',
      branch: st.branch || st.department?.name || st.department?.code || departments[0]?.name || '',
      batchYear: st.batchYear || '2024-2028',
      track: st.track || 'Full Stack Development',
      phone: st.phone || '',
      email: st.email || '',
      address: st.address || '',
      feeStatus: st.licenseFeeRecords?.[0]?.status || 'PAID',
      feeAmount: Number(st.licenseFeeRecords?.[0]?.amount) || 1500,
    });
    setStudentModalOpen(true);
  };

  const handleSaveStudent = async (e) => {
    e.preventDefault();
    try {
      if (editingStudent) {
        await api.put(`/users/${editingStudent.id}`, studentForm);
      } else {
        await api.post('/users/students', studentForm);
      }
      setStudentModalOpen(false);
      fetchStudents();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save student record.');
    }
  };

  // Single Archive with Active Constraint Lock Notice
  const handleArchiveStudent = async (st) => {
    const isHolding = st.receivedAllocations?.some((a) => a.status === 'ACTIVE');
    if (isHolding) {
      alert(
        `Active Constraint Lock Enforced:\n\nCannot archive student '${st.name}' (${st.rollNumberOrEmpId}) because they currently hold an active issued laptop.\n\nPlease accept laptop return before archiving.`
      );
      return;
    }

    if (
      !window.confirm(
        `Are you sure you want to archive student '${st.name}' (${st.rollNumberOrEmpId})?\n\nThis will soft-delete their record. Super Admins can restore archived records under Settings.`
      )
    ) {
      return;
    }

    try {
      await api.patch(`/users/${st.id}/archive`);
      if (drawerOpen && drawerUser?.id === st.id) setDrawerOpen(false);
      fetchStudents();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to archive student.');
    }
  };

  // Bulk Archive
  const handleBulkArchive = async () => {
    if (selectedIds.length === 0) return;
    if (
      !window.confirm(
        `Are you sure you want to archive ${selectedIds.length} selected students?\n\nRecords will be moved to the Soft-Delete Archive.`
      )
    ) {
      return;
    }

    try {
      await api.post('/users/bulk-archive', { ids: selectedIds });
      setSelectedIds([]);
      fetchStudents();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to archive selected students.');
    }
  };

  // Permanently Delete Single Student
  const handleDeleteStudent = async (st) => {
    if (
      !window.confirm(
        `Are you sure you want to permanently delete student '${st.name}' (${st.rollNumberOrEmpId}) from the database? This action cannot be undone.`
      )
    ) {
      return;
    }
    try {
      await api.delete(`/users/${st.id}`);
      fetchStudents();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete student.');
    }
  };

  // Bulk Permanently Delete Students
  const handleBulkDelete = async () => {
    if (
      !window.confirm(
        `Are you sure you want to permanently delete the ${selectedIds.length} selected student(s) from the database? This cannot be undone.`
      )
    ) {
      return;
    }
    try {
      const res = await api.post('/users/bulk-delete', { ids: selectedIds });
      alert(res.data.data?.message || 'Selected students permanently deleted.');
      setSelectedIds([]);
      fetchStudents();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete selected students.');
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
      const res = await api.post('/users/students/bulk-import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data.skippedCount > 0) {
        setImportErrors(res.data.errors || []);
        alert(
          `Import finished with warnings:\nSuccessfully imported: ${res.data.importedCount}\nSkipped: ${res.data.skippedCount}`
        );
      } else {
        alert(`Successfully imported ${res.data.importedCount} student records!`);
        setImportModalOpen(false);
      }
      fetchStudents();
    } catch (err) {
      alert(err.response?.data?.message || 'Import failed. Check file format.');
    } finally {
      setImportLoading(false);
    }
  };

  // Download Sample Template
  const handleDownloadTemplate = () => {
    window.location.href = `${api.defaults.baseURL}/users/students/template`;
  };

  // Export Full Directory
  const handleExportDirectory = () => {
    window.location.href = `${api.defaults.baseURL}/users/export?role=STUDENT`;
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {!hideTitle ? (
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2.5">
              <Users className="w-7 h-7 text-[#F26522]" />
              <span>Student Directory</span>
            </h1>
          </div>
        ) : (
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Verified Students Custody & License Registry
          </div>
        )}

        <div className="flex items-center space-x-2.5">
          <ColumnVisibilitySelector
            columns={STUDENT_COLUMNS}
            visibleColumns={visibleColumns}
            onChange={setVisibleColumns}
            storageKey="col_pref_students"
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
                <span>Add Student</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Metric Stat Cards (Unified Master StatCard Design) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Students"
          value={metrics.totalActiveStudents || 0}
          icon={Users}
          color="blue"
        />

        <StatCard
          title="Holding Active Laptop"
          value={metrics.holdingLaptop || 0}
          icon={Laptop}
          color="green"
          active={custodyStatus === 'HOLDING'}
          onClick={() => {
            setCustodyStatus(custodyStatus === 'HOLDING' ? 'ALL' : 'HOLDING');
            setPagination((p) => ({ ...p, page: 1 }));
          }}
        />

        <StatCard
          title="License Fee Cleared"
          value={metrics.feeCleared || 0}
          icon={CheckCircle}
          color="purple"
          active={feeStatus === 'PAID'}
          onClick={() => {
            setFeeStatus(feeStatus === 'PAID' ? 'ALL' : 'PAID');
            setPagination((p) => ({ ...p, page: 1 }));
          }}
        />

        <StatCard
          title="Fee Overdue / Unpaid"
          value={metrics.feeOverdue || 0}
          icon={AlertTriangle}
          color="amber"
          active={feeStatus === 'UNPAID'}
          onClick={() => {
            setFeeStatus(feeStatus === 'UNPAID' ? 'ALL' : 'UNPAID');
            setPagination((p) => ({ ...p, page: 1 }));
          }}
        />
      </div>

      {/* Filter Toolbar with CustomSelect */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Keyword Search */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Name, Roll No, Aadhaar, Mobile..."
              className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#F26522]/30 focus:border-[#F26522] transition"
            />
          </div>

          {/* Branch Filter */}
          <div className="w-56">
            <CustomSelect
              value={branch}
              onChange={setBranch}
              options={[
                { value: 'ALL', label: 'All Branches' },
                ...departments.map((d) => ({
                  value: d.name,
                  label: d.code ? `${d.name} (${d.code})` : d.name,
                })),
              ]}
              placeholder="Branch"
            />
          </div>

          {/* Batch Year Filter */}
          <div className="w-36">
            <CustomSelect
              value={batchYear}
              onChange={setBatchYear}
              options={[
                { value: 'ALL', label: 'All Batches' },
                ...availableBatches.map((b) => ({
                  value: b,
                  label: b,
                })),
              ]}
              placeholder="Batch Year"
            />
          </div>

          {/* Track Filter */}
          <div className="w-52">
            <CustomSelect
              value={track}
              onChange={setTrack}
              options={[
                { value: 'ALL', label: 'All Tracks' },
                ...availableTracks.map((t) => ({
                  value: t,
                  label: t,
                })),
              ]}
              placeholder="Track"
            />
          </div>

          {/* Laptop Custody Filter */}
          <div className="w-36">
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

          {/* Fee Status Filter */}
          <div className="w-36">
            <CustomSelect
              value={feeStatus}
              onChange={setFeeStatus}
              options={[
                { value: 'ALL', label: 'All Fees' },
                { value: 'PAID', label: 'Fee Cleared' },
                { value: 'UNPAID', label: 'Fee Overdue' },
                { value: 'PARTIAL', label: 'Partial Fee' },
                { value: 'EXEMPTED', label: 'Exempted' },
              ]}
              placeholder="Fee Status"
            />
          </div>

          {/* Reset Filters */}
          <button
            onClick={() => {
              setSearch('');
              setBranch('ALL');
              setBatchYear('ALL');
              setTrack('ALL');
              setCustodyStatus('ALL');
              setFeeStatus('ALL');
            }}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition"
            title="Reset Filters"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Compact Student Data Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[10.5px] font-bold text-slate-500 uppercase tracking-wider">
                {visibleColumns.includes('select') && (
                  <th className="py-2.5 px-2 w-8 text-center">
                    <input
                      type="checkbox"
                      checked={students.length > 0 && selectedIds.length === students.length}
                      onChange={handleSelectAll}
                      className="rounded border-slate-300 text-[#F26522] focus:ring-[#F26522]"
                    />
                  </th>
                )}
                {visibleColumns.includes('rollNo') && <th className="py-2.5 px-2">Roll No</th>}
                {visibleColumns.includes('name') && <th className="py-2.5 px-2">Student Name</th>}
                {visibleColumns.includes('fatherName') && <th className="py-2.5 px-2">Father Name</th>}
                {visibleColumns.includes('branch') && <th className="py-2.5 px-2">Branch</th>}
                {visibleColumns.includes('batch') && <th className="py-2.5 px-2">Batch</th>}
                {visibleColumns.includes('track') && <th className="py-2.5 px-2">Track</th>}
                {visibleColumns.includes('laptop') && <th className="py-2.5 px-2">Laptop</th>}
                {visibleColumns.includes('fee') && <th className="py-2.5 px-2">Fee</th>}
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
                      <span className="font-bold">Loading student records...</span>
                    </div>
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumns.length} className="py-16 text-center text-slate-400 font-medium">
                    No students match the selected filter criteria.
                  </td>
                </tr>
              ) : (
                students.map((st) => {
                  const activeAlloc = st.receivedAllocations?.find((a) => a.status === 'ACTIVE');
                  const isHolding = Boolean(activeAlloc);
                  const feeRecord = st.licenseFeeRecords?.[0];
                  const feeStatusBadge = feeRecord?.status || 'UNPAID';

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

                      {/* Roll Number */}
                      {visibleColumns.includes('rollNo') && (
                        <td className="py-2 px-2 font-mono font-bold text-slate-900">
                          {st.rollNumberOrEmpId}
                        </td>
                      )}

                      {/* Student Name & Avatar */}
                      {visibleColumns.includes('name') && (
                        <td className="py-2 px-2">
                          <div className="flex items-center space-x-2">
                            <div className="w-5 h-5 rounded-full bg-orange-100 text-orange-700 font-extrabold text-[9.5px] flex items-center justify-center shrink-0">
                              {st.name[0]}
                            </div>
                            <span className="font-bold text-slate-800">{st.name}</span>
                          </div>
                        </td>
                      )}

                      {/* Father's Name */}
                      {visibleColumns.includes('fatherName') && (
                        <td className="py-2 px-2 text-slate-600 font-medium">
                          {st.fatherName || '—'}
                        </td>
                      )}

                      {/* Branch Badge */}
                      {visibleColumns.includes('branch') && (
                        <td className="py-2 px-2">
                          <Badge variant="neutral" size="xs">
                            {st.branch || st.department?.name || st.department?.code || '—'}
                          </Badge>
                        </td>
                      )}

                      {/* Batch Year */}
                      {visibleColumns.includes('batch') && (
                        <td className="py-2 px-2 text-slate-500 font-medium">
                          {st.batchYear || '2024-2028'}
                        </td>
                      )}

                      {/* Track */}
                      {visibleColumns.includes('track') && (
                        <td className="py-2 px-2 text-slate-600 font-medium truncate max-w-[120px]">
                          {st.track || 'General'}
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

                      {/* License Fee Status */}
                      {visibleColumns.includes('fee') && (
                        <td className="py-2 px-2">
                          <Badge
                            variant={
                              feeStatusBadge === 'PAID'
                                ? 'success'
                                : feeStatusBadge === 'UNPAID'
                                ? 'danger'
                                : feeStatusBadge === 'PARTIAL'
                                ? 'warning'
                                : 'neutral'
                            }
                            size="xs"
                          >
                            {feeStatusBadge}
                          </Badge>
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
                                title="Edit Student"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => handleArchiveStudent(st)}
                                className="p-1 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                                title="Archive Student (Soft-Delete)"
                              >
                                <Archive className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => handleDeleteStudent(st)}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                title="Permanently Delete Student from Database"
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
          itemName="students"
        />
      </div>

      {/* Floating Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40 bg-slate-900/90 backdrop-blur-md text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center space-x-4 border border-slate-700 animate-in fade-in slide-in-from-bottom-3">
          <span className="text-xs font-bold text-orange-400">
            {selectedIds.length} {selectedIds.length === 1 ? 'student' : 'students'} selected
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
        onArchive={(st) => handleArchiveStudent(st)}
      />

      {/* Add / Edit Student Modal */}
      <Modal
        isOpen={studentModalOpen}
        onClose={() => setStudentModalOpen(false)}
        title={editingStudent ? 'Edit Student Details' : 'Register Single Student'}
      >
        <form onSubmit={handleSaveStudent} className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-xs">
            {/* Student Name */}
            <div className="col-span-2">
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Student Full Name *
              </label>
              <input
                type="text"
                required
                value={studentForm.name}
                onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })}
                placeholder="e.g., Aarav Sharma"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#F26522]/30 focus:border-[#F26522] outline-none"
              />
            </div>

            {/* Father's Name */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Father's Name
              </label>
              <input
                type="text"
                value={studentForm.fatherName}
                onChange={(e) => setStudentForm({ ...studentForm, fatherName: e.target.value })}
                placeholder="e.g., Suresh Sharma"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#F26522]/30 focus:border-[#F26522] outline-none"
              />
            </div>

            {/* Roll Number */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Roll Number (Unique Key) *
              </label>
              <input
                type="text"
                required
                value={studentForm.rollNumber}
                onChange={(e) => setStudentForm({ ...studentForm, rollNumber: e.target.value })}
                placeholder="e.g., 2025/001"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:ring-2 focus:ring-[#F26522]/30 focus:border-[#F26522] outline-none"
              />
            </div>

            {/* Aadhaar Number */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Aadhaar Number (Unique)
              </label>
              <input
                type="text"
                value={studentForm.aadhaarNumber}
                onChange={(e) => setStudentForm({ ...studentForm, aadhaarNumber: e.target.value })}
                placeholder="e.g., 3456-7890-1234"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:ring-2 focus:ring-[#F26522]/30 focus:border-[#F26522] outline-none"
              />
            </div>

            {/* Branch */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Class / Branch
              </label>
              <select
                value={studentForm.branch}
                onChange={(e) => setStudentForm({ ...studentForm, branch: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#F26522]/30 focus:border-[#F26522] outline-none"
              >
                {departments.length === 0 ? (
                  <option value={studentForm.branch}>{studentForm.branch || 'Select Branch'}</option>
                ) : (
                  departments.map((d) => (
                    <option key={d.id} value={d.name}>
                      {d.name} {d.code ? `(${d.code})` : ''}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Batch Year */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Batch / Academic Year
              </label>
              <input
                type="text"
                value={studentForm.batchYear}
                onChange={(e) => setStudentForm({ ...studentForm, batchYear: e.target.value })}
                placeholder="e.g., 2024-2028"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#F26522]/30 focus:border-[#F26522] outline-none"
              />
            </div>

            {/* Track */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Curriculum Track
              </label>
              <input
                type="text"
                value={studentForm.track}
                onChange={(e) => setStudentForm({ ...studentForm, track: e.target.value })}
                placeholder="e.g., Full Stack Development"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#F26522]/30 focus:border-[#F26522] outline-none"
              />
            </div>

            {/* Mobile Number */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Mobile Number
              </label>
              <input
                type="text"
                value={studentForm.phone}
                onChange={(e) => setStudentForm({ ...studentForm, phone: e.target.value })}
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
                value={studentForm.email}
                onChange={(e) => setStudentForm({ ...studentForm, email: e.target.value })}
                placeholder="st.name@ssism.edu"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#F26522]/30 focus:border-[#F26522] outline-none"
              />
            </div>

            {/* Address */}
            <div className="col-span-2">
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Residential Address
              </label>
              <input
                type="text"
                value={studentForm.address}
                onChange={(e) => setStudentForm({ ...studentForm, address: e.target.value })}
                placeholder="e.g., Ward 4, Sandalpur, Dist. Dewas"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#F26522]/30 focus:border-[#F26522] outline-none"
              />
            </div>

            {/* License Fee Initial Status (Only for New Registration) */}
            {!editingStudent && (
              <>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Software License Fee Status
                  </label>
                  <select
                    value={studentForm.feeStatus}
                    onChange={(e) => setStudentForm({ ...studentForm, feeStatus: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#F26522]/30 focus:border-[#F26522] outline-none"
                  >
                    <option value="PAID">PAID (Cleared)</option>
                    <option value="UNPAID">UNPAID (Pending)</option>
                    <option value="PARTIAL">PARTIAL</option>
                    <option value="EXEMPTED">EXEMPTED</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Laptop Maintenance Fee (₹ 1500 - 2000 Manual)
                  </label>
                  <input
                    type="number"
                    value={studentForm.feeAmount}
                    onChange={(e) => setStudentForm({ ...studentForm, feeAmount: e.target.value })}
                    placeholder="e.g. 1500 or 2000"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#F26522]/30 focus:border-[#F26522] outline-none"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Flexible manual charge: ₹1500 - ₹2000 (Applicable only to students)
                  </span>
                </div>
              </>
            )}
          </div>

          <div className="pt-3 border-t border-slate-200 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={() => setStudentModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-[#F26522] hover:bg-orange-600 text-white font-bold text-xs transition shadow-md shadow-orange-500/20"
            >
              {editingStudent ? 'Save Changes' : 'Register Student'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Bulk Import Modal */}
      <Modal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        title="Bulk Import Students (Excel / CSV)"
      >
        <form onSubmit={handleImportSubmit} className="space-y-4">
          <p className="text-xs text-slate-600">
            Upload an Excel (.xlsx) or CSV file with student enrollment details. Roll numbers, email IDs, and Aadhaar numbers will be verified for uniqueness.
          </p>

          <div className="p-4 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-between">
            <div className="flex items-center space-x-2 text-xs text-orange-800">
              <FileSpreadsheet className="w-5 h-5 text-orange-600" />
              <span>Need the standard template?</span>
            </div>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="px-3 py-1.5 rounded-lg bg-white border border-orange-200 text-orange-700 font-bold text-xs hover:bg-orange-100 transition shadow-xs flex items-center space-x-1"
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
