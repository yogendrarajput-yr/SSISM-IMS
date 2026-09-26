import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { StatCard } from '../components/common/StatCard';
import { Pagination } from '../components/common/Pagination';
import { ColumnVisibilitySelector } from '../components/common/ColumnVisibilitySelector';
import { useAuth } from '../context/AuthContext';
import { useDebounce } from '../hooks/useDebounce';
import { useNavigate } from 'react-router-dom';
import {
  Gift,
  Building2,
  Users,
  Laptop,
  Search,
  Plus,
  Mail,
  Phone,
  Calendar,
  Eye,
  Edit2,
  Trash2,
  ExternalLink,
  HeartHandshake,
} from 'lucide-react';

const DONOR_COLUMNS = [
  { key: 'contact', label: 'Representative / Contact', required: true },
  { key: 'organization', label: 'Organization / Entity' },
  { key: 'details', label: 'Contact Details' },
  { key: 'donationDate', label: 'Donation Date' },
  { key: 'donatedLaptops', label: 'Donated Laptops' },
  { key: 'actions', label: 'Actions', required: true },
];

/**
 * Donor & Purchase Management Module
 * Tracks corporate CSR grants, alumni hardware gifts, and compares purchased vs donated fleet statistics.
 */
export const Donors = () => {
  const [donors, setDonors] = useState([]);
  const [stats, setStats] = useState({
    totalDonors: 0,
    totalDonatedLaptops: 0,
    totalPurchasedLaptops: 0,
    totalLaptops: 0,
    donationRatio: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  const [visibleColumns, setVisibleColumns] = useState(() => {
    try {
      const saved = localStorage.getItem('col_pref_donors');
      return saved ? JSON.parse(saved) : DONOR_COLUMNS.map((c) => c.key);
    } catch {
      return DONOR_COLUMNS.map((c) => c.key);
    }
  });

  // Modal states
  const [donorModalOpen, setDonorModalOpen] = useState(false);
  const [editingDonor, setEditingDonor] = useState(null);
  const [viewingDonor, setViewingDonor] = useState(null);
  const [donorAssets, setDonorAssets] = useState([]);
  const [loadingAssets, setLoadingAssets] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    organization: '',
    email: '',
    phone: '',
    address: '',
    donationDate: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const debouncedSearch = useDebounce(search, 300);
  const { isStaff, isSuperAdmin } = useAuth();
  const navigate = useNavigate();

  const fetchDonors = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.append('search', debouncedSearch);
      params.append('page', page);
      params.append('limit', limit);

      const res = await api.get(`/donors?${params.toString()}`);
      setDonors(res.data.data.donors);
      setStats(res.data.data.stats);
      setPagination(res.data.data.pagination);
    } catch (err) {
      console.error('Failed to load donors directory:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDonors();
  }, [debouncedSearch, page, limit]);

  const handleOpenCreate = () => {
    setEditingDonor(null);
    setFormData({
      name: '',
      organization: '',
      email: '',
      phone: '',
      address: '',
      donationDate: new Date().toISOString().split('T')[0],
      notes: '',
    });
    setDonorModalOpen(true);
  };

  const handleOpenEdit = (donor) => {
    setEditingDonor(donor);
    setFormData({
      name: donor.name || '',
      organization: donor.organization || '',
      email: donor.email || '',
      phone: donor.phone || '',
      address: donor.address || '',
      donationDate: donor.donationDate ? donor.donationDate.split('T')[0] : '',
      notes: donor.notes || '',
    });
    setDonorModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingDonor) {
        await api.put(`/donors/${editingDonor.id}`, formData);
      } else {
        await api.post('/donors', formData);
      }
      setDonorModalOpen(false);
      fetchDonors();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save donor record.');
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to remove donor '${name}'?`)) return;
    try {
      await api.delete(`/donors/${id}`);
      fetchDonors();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete donor.');
    }
  };

  const handleViewDonatedAssets = async (donor) => {
    setViewingDonor(donor);
    setLoadingAssets(true);
    try {
      const res = await api.get(`/donors/${donor.id}`);
      setDonorAssets(res.data.data.donor.assets || []);
    } catch (err) {
      console.error('Failed to load donor assets:', err);
    } finally {
      setLoadingAssets(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Donor & Purchase Management
          </h1>
        </div>

        <div className="flex items-center gap-2.5">
          <ColumnVisibilitySelector
            columns={DONOR_COLUMNS}
            visibleColumns={visibleColumns}
            onChange={setVisibleColumns}
            storageKey="col_pref_donors"
          />

          {isStaff && (
            <button
              onClick={handleOpenCreate}
              className="px-4 py-2 rounded-xl bg-[#F26522] hover:bg-orange-600 text-white font-bold text-xs flex items-center space-x-1.5 transition shadow-md shadow-orange-500/25 self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>+ Register Donor</span>
            </button>
          )}
        </div>
      </div>

      {/* Analytics KPI Metric Cards (Unified Master StatCard Design) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Donated Laptops"
          value={stats.totalDonatedLaptops}
          icon={Gift}
          color="purple"
        />

        <StatCard
          title="Total Purchased Laptops"
          value={stats.totalPurchasedLaptops}
          icon={Building2}
          color="orange"
        />

        <StatCard
          title="Corporate & Alumni Donors"
          value={stats.totalDonors}
          icon={HeartHandshake}
          color="green"
        />

        <StatCard
          title="Total Campus Inventory"
          value={stats.totalLaptops}
          icon={Laptop}
          color="blue"
        />
      </div>

      {/* Fleet Acquisition Ratio Progress Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-700 flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-full bg-[#F26522] inline-block" />
            <span>Purchased Laptops: {stats.totalPurchasedLaptops} ({100 - stats.donationRatio}%)</span>
          </span>
          <span className="font-bold text-purple-700 flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-full bg-purple-500 inline-block" />
            <span>Donated Laptops: {stats.totalDonatedLaptops} ({stats.donationRatio}%)</span>
          </span>
        </div>
        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex">
          <div
            style={{ width: `${100 - stats.donationRatio}%` }}
            className="bg-[#F26522] h-full transition-all duration-500"
            title={`Purchased: ${100 - stats.donationRatio}%`}
          />
          <div
            style={{ width: `${stats.donationRatio}%` }}
            className="bg-purple-500 h-full transition-all duration-500"
            title={`Donated: ${stats.donationRatio}%`}
          />
        </div>
      </div>

      {/* Filter and Search Bar: relative z-10 for clean popover layering */}
      <div className="relative z-10 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search donors by representative name, organization, email, or phone..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-[#F26522] focus:ring-2 focus:ring-orange-500/20 outline-none"
          />
        </div>
      </div>

      {/* Donors Table Container */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs font-medium">
            <div className="w-8 h-8 border-3 border-orange-200 border-t-[#F26522] rounded-full animate-spin mx-auto mb-2.5" />
            Loading donors directory...
          </div>
        ) : donors.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs font-medium">
            No donor organizations found matching your search.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10.5px] font-bold uppercase tracking-wider text-slate-500">
                  {visibleColumns.includes('contact') && <th className="py-2.5 px-3">Representative / Contact</th>}
                  {visibleColumns.includes('organization') && <th className="py-2.5 px-3">Organization / Entity</th>}
                  {visibleColumns.includes('details') && <th className="py-2.5 px-3">Contact Details</th>}
                  {visibleColumns.includes('donationDate') && <th className="py-2.5 px-3">Donation Date</th>}
                  {visibleColumns.includes('donatedLaptops') && <th className="py-2.5 px-3">Donated Laptops</th>}
                  {visibleColumns.includes('actions') && (
                    <th className="py-2.5 px-3 text-right whitespace-nowrap">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {donors.map((donor) => (
                  <tr key={donor.id} className="hover:bg-orange-50/20 transition-colors">
                    {/* Representative Name */}
                    {visibleColumns.includes('contact') && (
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900">{donor.name}</div>
                        {donor.notes && <div className="text-[10px] text-slate-400 truncate max-w-xs">{donor.notes}</div>}
                      </td>
                    )}

                    {/* Organization */}
                    {visibleColumns.includes('organization') && (
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-800">{donor.organization || 'Individual Donor'}</div>
                        {donor.address && <div className="text-[10px] text-slate-400 truncate max-w-xs">{donor.address}</div>}
                      </td>
                    )}

                    {/* Contact details */}
                    {visibleColumns.includes('details') && (
                      <td className="py-2.5 px-3 space-y-0.5">
                        {donor.email && (
                          <div className="flex items-center space-x-1.5 text-slate-600">
                            <Mail className="w-3.5 h-3.5 text-slate-400" />
                            <span>{donor.email}</span>
                          </div>
                        )}
                        {donor.phone && (
                          <div className="flex items-center space-x-1.5 text-slate-600">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            <span>{donor.phone}</span>
                          </div>
                        )}
                      </td>
                    )}

                    {/* Donation Date */}
                    {visibleColumns.includes('donationDate') && (
                      <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{donor.donationDate ? new Date(donor.donationDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}</span>
                        </div>
                      </td>
                    )}

                    {/* Donated Laptops Count Badge */}
                    {visibleColumns.includes('donatedLaptops') && (
                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleViewDonatedAssets(donor)}
                          className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 font-bold text-xs transition"
                          title="View list of laptops donated by this partner"
                        >
                          <Gift className="w-3.5 h-3.5 text-purple-600" />
                          <span>{donor._count?.assets || 0} Laptops</span>
                          <ExternalLink className="w-3 h-3 ml-0.5 text-purple-500" />
                        </button>
                      </td>
                    )}

                    {/* Actions */}
                    {visibleColumns.includes('actions') && (
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end space-x-1.5 flex-nowrap">
                          <button
                            onClick={() => handleViewDonatedAssets(donor)}
                            title="View Donated Laptops"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-purple-600 hover:bg-purple-50 transition"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {isStaff && (
                            <button
                              onClick={() => handleOpenEdit(donor)}
                              title="Edit Donor Profile"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-[#F26522] hover:bg-orange-50 transition"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}
                          {isSuperAdmin && (
                            <button
                              onClick={() => handleDelete(donor.id, donor.name)}
                              title="Remove Donor"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
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
          itemName="donors"
        />
      </div>

      {/* Register / Edit Donor Modal */}
      <Modal
        isOpen={donorModalOpen}
        onClose={() => setDonorModalOpen(false)}
        title={editingDonor ? 'Edit Donor Profile' : 'Register Corporate or Alumni Donor'}
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Contact Representative *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Mr. Rajeshwar Rao"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-[#F26522] focus:ring-2 focus:ring-orange-500/20 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Organization / Trust Name
              </label>
              <input
                type="text"
                value={formData.organization}
                onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                placeholder="e.g. TCS CSR Foundation"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-[#F26522] focus:ring-2 focus:ring-orange-500/20 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="csr@organization.com"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-[#F26522] focus:ring-2 focus:ring-orange-500/20 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Phone Number
              </label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+91 98765 43210"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-[#F26522] focus:ring-2 focus:ring-orange-500/20 outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Address / Corporate Headquarters
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="City, State, Postal Code"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-[#F26522] focus:ring-2 focus:ring-orange-500/20 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Donation Date
              </label>
              <input
                type="date"
                value={formData.donationDate}
                onChange={(e) => setFormData({ ...formData, donationDate: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-[#F26522] outline-none bg-white"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Notes & Hardware Grant Details
              </label>
              <textarea
                rows={2}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="e.g. CSR STEM education hardware grant for computer laboratories."
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-[#F26522] outline-none"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => setDonorModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-bold text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-[#F26522] hover:bg-orange-600 text-white font-bold text-xs shadow-md shadow-orange-500/20"
            >
              {editingDonor ? 'Update Donor' : 'Register Donor'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Donated Laptops Drawer / Modal */}
      <Modal
        isOpen={!!viewingDonor}
        onClose={() => setViewingDonor(null)}
        title={`Laptops Donated by ${viewingDonor?.organization || viewingDonor?.name}`}
        maxWidth="max-w-4xl"
      >
        <div className="space-y-4">
          <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 text-xs text-purple-900 flex items-center justify-between">
            <div>
              <span className="font-bold">{viewingDonor?.name}</span> ({viewingDonor?.organization || 'Individual Donor'})
              {viewingDonor?.email && <span className="text-purple-700 block text-[11px]">{viewingDonor.email} • {viewingDonor.phone}</span>}
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-purple-600 text-white font-extrabold text-xs">
              {donorAssets.length} Units Donated
            </span>
          </div>

          {loadingAssets ? (
            <div className="p-8 text-center text-xs text-slate-400">
              <div className="w-6 h-6 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-2" />
              Loading donated laptops...
            </div>
          ) : donorAssets.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              No laptops are currently linked to this donor.
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto rounded-xl border border-slate-200">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10.5px] font-bold uppercase text-slate-500">
                    <th className="py-2.5 px-3">Asset Tag</th>
                    <th className="py-2.5 px-3">Make & Model</th>
                    <th className="py-2.5 px-3">Specs</th>
                    <th className="py-2.5 px-3">Condition</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Current Holder</th>
                    <th className="py-2.5 px-3 text-right">View</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {donorAssets.map((asset) => {
                    const activeAlloc = asset.allocations?.[0];
                    return (
                      <tr key={asset.id} className="hover:bg-slate-50 transition">
                        <td className="py-2.5 px-3 font-mono font-bold text-[#F26522]">
                          {asset.assetTag}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-800">
                          {asset.make} {asset.model}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                          {asset.processor} • {asset.ram}
                        </td>
                        <td className="py-2.5 px-3">
                          <Badge status={asset.condition} size="xs" />
                        </td>
                        <td className="py-2.5 px-3">
                          <Badge status={asset.status} size="xs" />
                        </td>
                        <td className="py-2.5 px-3">
                          {activeAlloc ? (
                            <div>
                              <div className="font-bold text-slate-800">{activeAlloc.recipient.name}</div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                {activeAlloc.recipient.rollNumberOrEmpId} ({activeAlloc.recipient.role})
                              </div>
                            </div>
                          ) : (
                            <span className="text-[10.5px] text-slate-400 italic">In Stock</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => {
                              setViewingDonor(null);
                              navigate(`/inventory/${asset.id}`);
                            }}
                            className="p-1 rounded-lg text-slate-400 hover:text-[#F26522] hover:bg-orange-50 transition"
                            title="View Asset Full Profile"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};
