import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Modal } from '../components/common/Modal';
import { useAuth } from '../context/AuthContext';
import {
  Building,
  Layers,
  ShieldCheck,
  Plus,
  Edit2,
  Trash2,
  Users,
  Laptop,
  Gift,
  Archive,
  RotateCcw,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/**
 * Dynamic Master Settings Page
 * Allows IT administrators to dynamically configure campus departments,
 * Phase 2 dynamic asset categories, donors registry, and review RBAC role permissions.
 */
export const Settings = () => {
  const [activeTab, setActiveTab] = useState('departments');
  const [settingsData, setSettingsData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Department Modal State
  const [deptModalOpen, setDeptModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [deptForm, setDeptForm] = useState({ name: '', code: '' });

  // Category Modal State
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState(null);
  const [catForm, setCatForm] = useState({ name: '', code: '', description: '' });

  // Universal Soft-Delete Archived Records State
  const [archivedData, setArchivedData] = useState({
    assets: [],
    students: [],
    staff: [],
    departments: [],
    counts: { total: 0 },
  });
  const [archivedSubTab, setArchivedSubTab] = useState('assets');
  const [archivedLoading, setArchivedLoading] = useState(false);

  const { isSuperAdmin } = useAuth();
  const navigate = useNavigate();

  const fetchArchivedRecords = async () => {
    setArchivedLoading(true);
    try {
      const res = await api.get('/settings/archived');
      setArchivedData(res.data.data);
    } catch (err) {
      console.error('Failed to load archived records:', err);
    } finally {
      setArchivedLoading(false);
    }
  };

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await api.get('/settings');
      setSettingsData(res.data.data);
      fetchArchivedRecords();
    } catch (err) {
      console.error('Failed to load master settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    if (activeTab === 'archived') {
      fetchArchivedRecords();
    }
  }, [activeTab]);

  // Department CRUD
  const handleOpenCreateDept = () => {
    setEditingDept(null);
    setDeptForm({ name: '', code: '' });
    setDeptModalOpen(true);
  };

  const handleOpenEditDept = (dept) => {
    setEditingDept(dept);
    setDeptForm({ name: dept.name, code: dept.code });
    setDeptModalOpen(true);
  };

  const handleSaveDept = async (e) => {
    e.preventDefault();
    try {
      if (editingDept) {
        await api.put(`/settings/departments/${editingDept.id}`, deptForm);
      } else {
        await api.post('/settings/departments', deptForm);
      }
      setDeptModalOpen(false);
      fetchSettings();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save department.');
    }
  };

  const handleDeleteDept = async (dept) => {
    if (dept._count?.users > 0 || dept._count?.assets > 0) {
      alert(`Active Constraint Lock:\n\nCannot archive department '${dept.code}' because it currently has ${dept._count.users} users and ${dept._count.assets} assets assigned. Reassign them first.`);
      return;
    }
    if (!window.confirm(`Are you sure you want to archive department ${dept.code} - ${dept.name}?\n\nThis will soft-delete the department.`)) return;
    try {
      await api.patch(`/settings/departments/${dept.id}/archive`);
      fetchSettings();
      fetchArchivedRecords();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to archive department.');
    }
  };

  // Restoration Handlers
  const handleRestoreAsset = async (asset) => {
    if (!window.confirm(`Restore laptop '${asset.assetTag}' (${asset.model}) back to active inventory?`)) return;
    try {
      await api.patch(`/assets/${asset.id}/restore`);
      alert(`Asset '${asset.assetTag}' restored successfully.`);
      fetchArchivedRecords();
      fetchSettings();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to restore asset.');
    }
  };

  const handleRestoreUser = async (user) => {
    if (!window.confirm(`Restore ${user.role.toLowerCase()} '${user.name}' (${user.rollNumberOrEmpId}) back to active directory?`)) return;
    try {
      await api.patch(`/users/${user.id}/restore`);
      alert(`User '${user.name}' restored successfully.`);
      fetchArchivedRecords();
      fetchSettings();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to restore user.');
    }
  };

  const handleRestoreDept = async (dept) => {
    if (!window.confirm(`Restore department '${dept.code}' - ${dept.name} back to active departments?`)) return;
    try {
      await api.patch(`/settings/departments/${dept.id}/restore`);
      alert(`Department '${dept.code}' restored successfully.`);
      fetchArchivedRecords();
      fetchSettings();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to restore department.');
    }
  };

  // Category CRUD
  const handleOpenCreateCat = () => {
    setEditingCat(null);
    setCatForm({ name: '', code: '', description: '' });
    setCatModalOpen(true);
  };

  const handleOpenEditCat = (cat) => {
    setEditingCat(cat);
    setCatForm({ name: cat.name, code: cat.code, description: cat.description || '' });
    setCatModalOpen(true);
  };

  const handleSaveCat = async (e) => {
    e.preventDefault();
    try {
      if (editingCat) {
        await api.put(`/settings/categories/${editingCat.id}`, catForm);
      } else {
        await api.post('/settings/categories', catForm);
      }
      setCatModalOpen(false);
      fetchSettings();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save category.');
    }
  };

  const handleDeleteCat = async (cat) => {
    if (!window.confirm(`Are you sure you want to delete category '${cat.name}'?`)) return;
    try {
      await api.delete(`/settings/categories/${cat.id}`);
      fetchSettings();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete category.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Master Settings & Administrative Configuration
          </h1>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => navigate('/donors')}
            className="px-3.5 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 font-bold text-xs flex items-center space-x-1.5 transition"
          >
            <Gift className="w-4 h-4 text-purple-600" />
            <span>Manage Donors</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 space-x-2">
        <button
          onClick={() => setActiveTab('departments')}
          className={`pb-3 px-4 font-bold text-xs flex items-center space-x-2 border-b-2 transition ${
            activeTab === 'departments'
              ? 'border-[#F26522] text-[#F26522]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>Campus Departments ({settingsData?.departments?.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab('categories')}
          className={`pb-3 px-4 font-bold text-xs flex items-center space-x-2 border-b-2 transition ${
            activeTab === 'categories'
              ? 'border-[#F26522] text-[#F26522]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Asset Categories ({settingsData?.categories?.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab('roles')}
          className={`pb-3 px-4 font-bold text-xs flex items-center space-x-2 border-b-2 transition ${
            activeTab === 'roles'
              ? 'border-[#F26522] text-[#F26522]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Roles & Security RBAC</span>
        </button>

        {isSuperAdmin && (
          <button
            onClick={() => setActiveTab('archived')}
            className={`pb-3 px-4 font-bold text-xs flex items-center space-x-2 border-b-2 transition ${
              activeTab === 'archived'
                ? 'border-[#F26522] text-[#F26522]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Archive className="w-4 h-4" />
            <span>Archived Records ({archivedData?.counts?.total || 0})</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400 text-xs font-medium">
          <div className="w-8 h-8 border-3 border-orange-200 border-t-[#F26522] rounded-full animate-spin mx-auto mb-2.5" />
          Loading master settings...
        </div>
      ) : (
        <>
          {/* TAB 1: DEPARTMENTS */}
          {activeTab === 'departments' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-800">Academic & Operational Departments</h2>
                </div>
                {isSuperAdmin && (
                  <button
                    onClick={handleOpenCreateDept}
                    className="px-3.5 py-1.5 rounded-xl bg-[#F26522] hover:bg-orange-600 text-white font-bold text-xs flex items-center space-x-1.5 transition shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Add Department</span>
                  </button>
                )}
              </div>

              <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[10.5px] font-bold uppercase text-slate-500">
                        <th className="py-2.5 px-3">Code</th>
                        <th className="py-2.5 px-3">Department Name</th>
                        <th className="py-2.5 px-3">Associated Users</th>
                        <th className="py-2.5 px-3">Assigned Assets</th>
                        <th className="py-2.5 px-3 text-right whitespace-nowrap">Actions</th>
                      </tr>
                    </thead>
                  <tbody className="divide-y divide-slate-100">
                    {settingsData?.departments?.map((dept) => (
                      <tr key={dept.id} className="hover:bg-slate-50 transition">
                        <td className="py-3 px-4 font-mono font-bold text-[#F26522]">
                          {dept.code}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-800">
                          {dept.name}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold">
                            <Users className="w-3 h-3 text-slate-400" />
                            <span>{dept._count?.users || 0} Members</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-orange-50 text-orange-700 font-semibold">
                            <Laptop className="w-3 h-3 text-orange-500" />
                            <span>{dept._count?.assets || 0} Laptops</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {isSuperAdmin && (
                            <div className="flex items-center justify-end space-x-1.5">
                              <button
                                onClick={() => handleOpenEditDept(dept)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-[#F26522] hover:bg-orange-50 transition"
                                title="Edit Department"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteDept(dept)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                                title="Delete Department"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ASSET CATEGORIES */}
          {activeTab === 'categories' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-800">Phase 2 Dynamic Asset Categories</h2>
                </div>
                {isSuperAdmin && (
                  <button
                    onClick={handleOpenCreateCat}
                    className="px-3.5 py-1.5 rounded-xl bg-[#F26522] hover:bg-orange-600 text-white font-bold text-xs flex items-center space-x-1.5 transition shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Add Category</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {settingsData?.categories?.map((cat) => (
                  <div key={cat.id} className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-orange-100 text-[#F26522]">
                          {cat.code}
                        </span>
                        {isSuperAdmin && (
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={() => handleOpenEditCat(cat)}
                              className="p-1 rounded text-slate-400 hover:text-[#F26522]"
                              title="Edit Category"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteCat(cat)}
                              className="p-1 rounded text-slate-400 hover:text-rose-600"
                              title="Delete Category"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                      <h3 className="font-bold text-slate-900 text-sm mt-2">{cat.name}</h3>
                      <p className="text-slate-500 text-xs mt-1">{cat.description || 'General educational asset category.'}</p>
                    </div>

                    <div className="pt-2 border-t border-slate-100 text-[10px] text-slate-400 flex items-center justify-between">
                      <span>Phase 2 Ready</span>
                      <span className="text-emerald-600 font-bold font-mono">MySQL JSON Enabled</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: ROLES & RBAC */}
          {activeTab === 'roles' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-sm font-bold text-slate-800">5-Tier Role-Based Access Control (RBAC) Matrix</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {settingsData?.roles?.map((r) => (
                  <div key={r.role} className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 font-bold font-mono text-xs">
                        {r.role}
                      </span>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#F26522]">
                        Level {r.level} Privilege
                      </span>
                    </div>
                    <h3 className="font-bold text-slate-900 text-sm">{r.label}</h3>
                    <p className="text-xs text-slate-600">{r.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: UNIVERSAL ARCHIVED RECORDS */}
          {activeTab === 'archived' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold text-slate-800 flex items-center space-x-2">
                    <Archive className="w-4 h-4 text-[#F26522]" />
                    <span>Universal Soft-Delete Archive & Record Restoration</span>
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    Recover soft-deleted Laptops, Students, Staff, and Departments without permanent data destruction.
                  </p>
                </div>

                <button
                  onClick={fetchArchivedRecords}
                  className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-600 font-bold text-xs flex items-center space-x-1.5 hover:bg-slate-50 transition shadow-xs self-start"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                  <span>Refresh Archive</span>
                </button>
              </div>

              {/* Sub-tab selection pills */}
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  onClick={() => setArchivedSubTab('assets')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                    archivedSubTab === 'assets'
                      ? 'bg-[#F26522] text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Laptops ({archivedData.counts?.assets || 0})
                </button>

                <button
                  onClick={() => setArchivedSubTab('students')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                    archivedSubTab === 'students'
                      ? 'bg-[#F26522] text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Students ({archivedData.counts?.students || 0})
                </button>

                <button
                  onClick={() => setArchivedSubTab('staff')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                    archivedSubTab === 'staff'
                      ? 'bg-[#F26522] text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Staff & Faculty ({archivedData.counts?.staff || 0})
                </button>

                <button
                  onClick={() => setArchivedSubTab('departments')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                    archivedSubTab === 'departments'
                      ? 'bg-[#F26522] text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Departments ({archivedData.counts?.departments || 0})
                </button>
              </div>

              {/* Sub-Tab 1: Archived Assets */}
              {archivedSubTab === 'assets' && (
                <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
                  {archivedLoading ? (
                    <div className="p-10 text-center text-slate-400 text-xs font-medium">
                      Loading archived laptops...
                    </div>
                  ) : archivedData.assets?.length === 0 ? (
                    <div className="p-10 text-center text-slate-400 text-xs font-medium">
                      No archived laptop records found.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-[10.5px] font-bold text-slate-500 uppercase tracking-wider">
                            <th className="py-2.5 px-3">Asset Tag</th>
                            <th className="py-2.5 px-3">Serial Number</th>
                            <th className="py-2.5 px-3">Make & Model</th>
                            <th className="py-2.5 px-3">Department</th>
                            <th className="py-2.5 px-3">Archived On</th>
                            <th className="py-2.5 px-3 text-right whitespace-nowrap">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {archivedData.assets?.map((a) => (
                            <tr key={a.id} className="hover:bg-slate-50/80">
                              <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{a.assetTag}</td>
                              <td className="py-2.5 px-3 font-mono text-slate-600">{a.serialNumber}</td>
                              <td className="py-2.5 px-3 font-medium text-slate-800">{a.make} {a.model}</td>
                              <td className="py-2.5 px-3 text-slate-500">{a.department?.code || 'N/A'}</td>
                              <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap">
                                {a.archivedAt ? new Date(a.archivedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                              </td>
                              <td className="py-2.5 px-3.5 text-right whitespace-nowrap">
                                <button
                                  onClick={() => handleRestoreAsset(a)}
                                  className="px-3 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 font-bold text-xs inline-flex items-center space-x-1 transition"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                  <span>Restore</span>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Sub-Tab 2: Archived Students */}
              {archivedSubTab === 'students' && (
                <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
                  {archivedData.students?.length === 0 ? (
                    <div className="p-10 text-center text-slate-400 text-xs font-medium">
                      No archived student records found.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-[10.5px] font-bold text-slate-500 uppercase tracking-wider">
                            <th className="py-2.5 px-3">Roll Number</th>
                            <th className="py-2.5 px-3">Student Name</th>
                            <th className="py-2.5 px-3">Branch</th>
                            <th className="py-2.5 px-3">Batch Year</th>
                            <th className="py-2.5 px-3">Archived On</th>
                            <th className="py-2.5 px-3 text-right whitespace-nowrap">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {archivedData.students?.map((s) => (
                            <tr key={s.id} className="hover:bg-slate-50/80">
                              <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{s.rollNumberOrEmpId}</td>
                              <td className="py-2.5 px-3 font-bold text-slate-800">{s.name}</td>
                              <td className="py-2.5 px-3 text-slate-600">{s.branch || s.department?.code || 'N/A'}</td>
                              <td className="py-2.5 px-3 text-slate-500">{s.batchYear || 'N/A'}</td>
                              <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap">
                                {s.archivedAt ? new Date(s.archivedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                              </td>
                              <td className="py-2.5 px-3.5 text-right whitespace-nowrap">
                                <button
                                  onClick={() => handleRestoreUser(s)}
                                  className="px-3 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 font-bold text-xs inline-flex items-center space-x-1 transition"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                  <span>Restore</span>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Sub-Tab 3: Archived Staff */}
              {archivedSubTab === 'staff' && (
                <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
                  {archivedData.staff?.length === 0 ? (
                    <div className="p-10 text-center text-slate-400 text-xs font-medium">
                      No archived staff or faculty records found.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-[10.5px] font-bold text-slate-500 uppercase tracking-wider">
                            <th className="py-2.5 px-3">Employee ID</th>
                            <th className="py-2.5 px-3">Staff Name</th>
                            <th className="py-2.5 px-3">Department</th>
                            <th className="py-2.5 px-3">Designation</th>
                            <th className="py-2.5 px-3">Archived On</th>
                            <th className="py-2.5 px-3 text-right whitespace-nowrap">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {archivedData.staff?.map((st) => (
                            <tr key={st.id} className="hover:bg-slate-50/80">
                              <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{st.rollNumberOrEmpId}</td>
                              <td className="py-2.5 px-3 font-bold text-slate-800">{st.name}</td>
                              <td className="py-2.5 px-3 text-slate-600">{st.department?.code || 'N/A'}</td>
                              <td className="py-2.5 px-3 text-slate-600">{st.designation || st.role}</td>
                              <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap">
                                {st.archivedAt ? new Date(st.archivedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                              </td>
                              <td className="py-2.5 px-3.5 text-right whitespace-nowrap">
                                <button
                                  onClick={() => handleRestoreUser(st)}
                                  className="px-3 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 font-bold text-xs inline-flex items-center space-x-1 transition"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                  <span>Restore</span>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Sub-Tab 4: Archived Departments */}
              {archivedSubTab === 'departments' && (
                <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
                  {archivedData.departments?.length === 0 ? (
                    <div className="p-10 text-center text-slate-400 text-xs font-medium">
                      No archived campus department records found.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-[10.5px] font-bold text-slate-500 uppercase tracking-wider">
                            <th className="py-2.5 px-3">Dept Code</th>
                            <th className="py-2.5 px-3">Department Full Name</th>
                            <th className="py-2.5 px-3">Archived On</th>
                            <th className="py-2.5 px-3 text-right whitespace-nowrap">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {archivedData.departments?.map((d) => (
                            <tr key={d.id} className="hover:bg-slate-50/80">
                              <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{d.code}</td>
                              <td className="py-2.5 px-3 font-medium text-slate-800">{d.name}</td>
                              <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap">
                                {d.archivedAt ? new Date(d.archivedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                              </td>
                              <td className="py-2.5 px-3.5 text-right whitespace-nowrap">
                                <button
                                  onClick={() => handleRestoreDept(d)}
                                  className="px-3 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 font-bold text-xs inline-flex items-center space-x-1 transition"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                  <span>Restore</span>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* MODAL: Add/Edit Department */}
      <Modal
        isOpen={deptModalOpen}
        onClose={() => setDeptModalOpen(false)}
        title={editingDept ? 'Update Department Details' : 'Register New Campus Department'}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSaveDept} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Department Short Code *
            </label>
            <input
              type="text"
              required
              value={deptForm.code}
              onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value })}
              placeholder="e.g. AI-DS, MBA, IT Excellence Group"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-[#F26522] outline-none font-mono uppercase"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Full Department Name *
            </label>
            <input
              type="text"
              required
              value={deptForm.name}
              onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
              placeholder="e.g. Artificial Intelligence & Data Science"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-[#F26522] outline-none"
            />
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => setDeptModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-bold text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-[#F26522] hover:bg-orange-600 text-white font-bold text-xs shadow-md shadow-orange-500/20"
            >
              {editingDept ? 'Update Department' : 'Save Department'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Category Modal */}
      <Modal
        isOpen={catModalOpen}
        onClose={() => setCatModalOpen(false)}
        title={editingCat ? `Edit Category (${editingCat.code})` : 'Add Phase 2 Equipment Category'}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSaveCat} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Category Code *
            </label>
            <input
              type="text"
              required
              value={catForm.code}
              onChange={(e) => setCatForm({ ...catForm, code: e.target.value })}
              placeholder="e.g. BIOMETRIC_DEVICE, AUDIO_SPEAKER"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-[#F26522] outline-none font-mono uppercase"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Category Name *
            </label>
            <input
              type="text"
              required
              value={catForm.name}
              onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
              placeholder="e.g. Biometric Attendance Terminals"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-[#F26522] outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Description
            </label>
            <textarea
              rows={2}
              value={catForm.description}
              onChange={(e) => setCatForm({ ...catForm, description: e.target.value })}
              placeholder="Brief equipment specification guidelines..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-[#F26522] outline-none"
            />
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => setCatModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-bold text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-[#F26522] hover:bg-orange-600 text-white font-bold text-xs shadow-md shadow-orange-500/20"
            >
              {editingCat ? 'Update Category' : 'Save Category'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
