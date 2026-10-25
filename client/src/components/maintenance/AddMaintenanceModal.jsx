import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { CustomSelect } from '../common/CustomSelect';
import { api } from '../../services/api';
import { Wrench } from 'lucide-react';

/**
 * AddMaintenanceModal Component
 * 
 * Records hardware upgrade or repair activity for a specific asset
 * (RAM upgrade, SSD expansion, screen replacement, battery service)
 * and transitions asset status accordingly.
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Modal visibility flag
 * @param {Function} props.onClose - Modal close handler
 * @param {Object} [props.asset] - Target hardware asset
 * @param {Function} props.onSuccess - Callback triggered upon successful log creation
 */
export const AddMaintenanceModal = ({ isOpen, onClose, asset = null, onSuccess }) => {
  const [type, setType] = useState('RAM_UPGRADE');
  const [cost, setCost] = useState('');
  const [vendor, setVendor] = useState('');
  const [description, setDescription] = useState('');
  const [updateStatusTo, setUpdateStatusTo] = useState('AVAILABLE');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!asset) return;

    setLoading(true);
    setError(null);

    try {
      const res = await api.post('/maintenance', {
        assetId: asset.id,
        type,
        cost: cost ? parseFloat(cost) : null,
        vendorOrTechnician: vendor || null,
        description,
        updateAssetStatusTo: updateStatusTo || undefined,
      });

      onSuccess(res.data.data.log);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to record maintenance activity.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Record Hardware Upgrade / Repair: ${asset?.assetTag || ''}`} maxWidth="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
            {error}
          </div>
        )}

        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 flex justify-between">
          <div>
            <span className="font-bold text-slate-800">Target Asset: </span>
            <span className="font-mono text-brand-600 font-bold">{asset?.assetTag}</span> ({asset?.make} {asset?.model})
          </div>
          <div>
            <span className="font-bold text-slate-800">Current Status: </span>
            <span>{asset?.status}</span>
          </div>
        </div>

        {/* Upgrade / Repair Type */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
            Maintenance / Upgrade Type *
          </label>
          <CustomSelect
            value={type}
            onChange={(val) => setType(val)}
            options={[
              { value: 'RAM_UPGRADE', label: 'RAM Upgrade (e.g. 8GB → 16GB / 32GB)' },
              { value: 'SSD_UPGRADE', label: 'SSD Storage Expansion / Replacement' },
              { value: 'BATTERY_REPLACEMENT', label: 'Battery Replacement (OEM Unit)' },
              { value: 'SCREEN_REPAIR', label: 'Display / IPS Panel Screen Repair' },
              { value: 'KEYBOARD_REPAIR', label: 'Keyboard / Trackpad Replacement' },
              { value: 'GENERAL_SERVICE', label: 'Thermal Paste & Dust Cleaning Service' },
              { value: 'OS_INSTALLATION', label: 'OS Reinstallation & Campus Image Setup' },
              { value: 'OTHER', label: 'Other Component Repair' },
            ]}
            className="w-full"
            buttonClassName="py-2.5 text-xs rounded-xl"
          />
        </div>

        {/* Cost & Vendor */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Service Cost (₹ INR)
            </label>
            <input
              type="number"
              step="0.01"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              placeholder="e.g. 3500.00"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 text-sm outline-none text-slate-800"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Technician / Vendor
            </label>
            <input
              type="text"
              value={vendor}
              onChange={(e) => setVendor(e.target.value)}
              placeholder="e.g. Dell Authorized Care"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 text-sm outline-none text-slate-800"
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
            Technical Details & Part Serial Numbers *
          </label>
          <textarea
            rows="3"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Detailed notes on what was installed or repaired, part numbers, warranty status on new component..."
            className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 text-sm outline-none text-slate-800"
            required
          />
        </div>

        {/* Asset status transition */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
            Set Asset Status After Operation
          </label>
          <CustomSelect
            value={updateStatusTo}
            onChange={(val) => setUpdateStatusTo(val)}
            options={[
              { value: 'AVAILABLE', label: 'AVAILABLE (Service Complete, Ready for Allocation)' },
              { value: 'UNDER_MAINTENANCE', label: 'UNDER_MAINTENANCE (Awaiting Parts / Testing)' },
              { value: 'RETIRED', label: 'RETIRED (Beyond Economical Repair / Written Off)' },
            ]}
            className="w-full"
            buttonClassName="py-2 text-xs rounded-xl"
          />
        </div>

        <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 text-sm font-bold text-white bg-[#F26522] hover:bg-orange-600 rounded-xl shadow-md shadow-orange-500/20 transition flex items-center space-x-2"
          >
            <Wrench className="w-4 h-4" />
            <span>{loading ? 'Recording...' : 'Save Maintenance Log'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
