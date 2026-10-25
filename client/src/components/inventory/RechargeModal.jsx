import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { CustomSelect } from '../common/CustomSelect';
import { api } from '../../services/api';
import {
  Radio,
  Zap,
  History,
  Calendar,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  ShieldCheck,
  Receipt,
  FileText,
} from 'lucide-react';

export const RechargeModal = ({ isOpen, onClose, asset, onSuccess }) => {
  const [activeTab, setActiveTab] = useState('recharge'); // 'recharge' | 'history'
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [amount, setAmount] = useState('');
  const [validityDays, setValidityDays] = useState(30);
  const [serviceProvider, setServiceProvider] = useState('JIO');
  const [planDetails, setPlanDetails] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [paymentMode, setPaymentMode] = useState('UPI');
  const [rechargeDate, setRechargeDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [newExpiryDate, setNewExpiryDate] = useState('');
  const [notes, setNotes] = useState('');

  // Initialize form when asset changes
  useEffect(() => {
    if (asset) {
      setAmount(asset.monthlyCost ? String(asset.monthlyCost) : '1199');
      setServiceProvider(asset.serviceProvider || 'JIO');
      setPlanDetails(asset.planDetails || '100 Mbps Unlimited AirFiber');
      setTransactionId(`TXN-${Math.floor(100000 + Math.random() * 900000)}`);
      setValidityDays(30);
      setRechargeDate(new Date().toISOString().split('T')[0]);
      setNotes('');
      calculateExpiry(30, new Date().toISOString().split('T')[0], asset.rechargeExpiryDate);
    }
  }, [asset]);

  // Calculate live expiry date
  const calculateExpiry = (days, recDateStr, currentExpiryStr) => {
    const recDate = recDateStr ? new Date(recDateStr) : new Date();
    let baseDate = recDate;
    if (currentExpiryStr) {
      const curExp = new Date(currentExpiryStr);
      if (curExp > recDate) {
        baseDate = curExp;
      }
    }
    const computed = new Date(baseDate.getTime() + Number(days) * 24 * 60 * 60 * 1000);
    setNewExpiryDate(computed.toISOString().split('T')[0]);
  };

  const handleValidityChange = (days) => {
    setValidityDays(days);
    calculateExpiry(days, rechargeDate, asset?.rechargeExpiryDate);
  };

  const handleRechargeDateChange = (dStr) => {
    setRechargeDate(dStr);
    calculateExpiry(validityDays, dStr, asset?.rechargeExpiryDate);
  };

  // Load history when tab is clicked
  useEffect(() => {
    if (isOpen && asset && activeTab === 'history') {
      fetchHistory();
    }
  }, [isOpen, asset, activeTab]);

  const fetchHistory = async () => {
    if (!asset) return;
    setLoadingHistory(true);
    try {
      const res = await api.get(`/assets/${asset.id}/recharge-history`);
      setHistory(res.data.data?.history || []);
    } catch (err) {
      console.error('Failed to load recharge history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) {
      alert('Please enter a valid recharge amount.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post(`/assets/${asset.id}/recharge`, {
        amount: Number(amount),
        validityDays: Number(validityDays),
        serviceProvider,
        planDetails,
        transactionId,
        paymentMode,
        rechargeDate: new Date(rechargeDate).toISOString(),
        newExpiryDate: new Date(newExpiryDate).toISOString(),
        notes,
      });

      alert(`Recharge of ₹${amount} logged successfully for ${asset.assetTag}!`);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to record device recharge.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!asset) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`AirFiber / Router Recharge • ${asset.assetTag}`}
      maxWidth="max-w-2xl"
    >
      <div className="space-y-4">
        {/* Device Summary Header Banner */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50/50 border border-orange-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#F26522] text-white flex items-center justify-center shrink-0 shadow-sm">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-slate-900 text-sm">{asset.make} {asset.model}</span>
                <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-white text-[#F26522] border border-orange-200">
                  {asset.serviceProvider || 'JIO'}
                </span>
              </div>
              <div className="text-[11px] text-slate-500 flex items-center space-x-2 mt-0.5">
                <span>SIM: <strong className="font-mono text-slate-700">{asset.simNumber || 'No SIM Assigned'}</strong></span>
                {asset.location && (
                  <>
                    <span>•</span>
                    <span>Loc: <strong className="text-slate-700">{asset.location}</strong></span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="text-right sm:border-l sm:border-orange-200/80 sm:pl-4">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Current Expiry</div>
            <div className={`font-mono text-xs font-black ${
              asset.rechargeStatus === 'EXPIRED'
                ? 'text-rose-600'
                : asset.rechargeStatus === 'EXPIRING_SOON'
                ? 'text-amber-600'
                : 'text-emerald-600'
            }`}>
              {asset.rechargeExpiryDate
                ? new Date(asset.rechargeExpiryDate).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })
                : 'Not Set / Expired'}
            </div>
            <div className="text-[10px] font-bold text-slate-500">
              {asset.daysRemaining !== null && asset.daysRemaining !== undefined
                ? asset.daysRemaining < 0
                  ? `${Math.abs(asset.daysRemaining)} days overdue`
                  : `${asset.daysRemaining} days left`
                : 'No Cycle Active'}
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab('recharge')}
            className={`flex items-center space-x-2 py-2 px-4 border-b-2 text-xs font-bold transition ${
              activeTab === 'recharge'
                ? 'border-[#F26522] text-[#F26522]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Log New Recharge</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`flex items-center space-x-2 py-2 px-4 border-b-2 text-xs font-bold transition ${
              activeTab === 'history'
                ? 'border-[#F26522] text-[#F26522]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Recharge Audit Ledger</span>
          </button>
        </div>

        {/* TAB 1: FORM */}
        {activeTab === 'recharge' && (
          <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Recharge Amount */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Recharge Amount (₹) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-400 font-bold">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="1199.00"
                    className="w-full pl-7 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-[#F26522]/30 focus:border-[#F26522] outline-none"
                  />
                </div>
              </div>

              {/* Service Provider */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Service Provider *
                </label>
                <CustomSelect
                  value={serviceProvider}
                  onChange={(val) => setServiceProvider(val)}
                  options={[
                    { value: 'JIO', label: 'Jio (Reliance Jio 5G AirFiber)' },
                    { value: 'AIRTEL', label: 'Airtel (Xstream AirFiber 5G)' },
                    { value: 'BSNL', label: 'BSNL (Bharat AirFiber Broadband)' },
                    { value: 'VI', label: 'Vodafone Idea (Vi AirFiber)' },
                    { value: 'OTHER', label: 'Other Enterprise ISP' },
                  ]}
                  className="w-full"
                  buttonClassName="py-2 font-bold text-slate-800"
                />
              </div>

              {/* Validity Presets & Days */}
              <div className="col-span-1 sm:col-span-2 space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-700">
                  Cycle Validity (Days) *
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  {[28, 30, 84, 90, 180, 365].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => handleValidityChange(d)}
                      className={`px-3 py-1.5 rounded-lg font-bold text-[11px] transition ${
                        validityDays === d
                          ? 'bg-[#F26522] text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {d === 365 ? '1 Year (365d)' : d === 180 ? '6 Mos (180d)' : d === 90 ? '3 Mos (90d)' : `${d} Days`}
                    </button>
                  ))}
                  <div className="w-24">
                    <input
                      type="number"
                      value={validityDays}
                      onChange={(e) => handleValidityChange(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-center font-bold text-slate-800 focus:ring-1 focus:ring-[#F26522] outline-none text-[11px]"
                      placeholder="Custom"
                    />
                  </div>
                </div>
              </div>

              {/* Plan Details */}
              <div className="col-span-1 sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Plan Details / Package Name
                </label>
                <input
                  type="text"
                  value={planDetails}
                  onChange={(e) => setPlanDetails(e.target.value)}
                  placeholder="e.g., 100 Mbps Unlimited AirFiber with 800+ TV Channels"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-[#F26522]/30 focus:border-[#F26522] outline-none"
                />
              </div>

              {/* Transaction ID / Receipt No */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Transaction ID / UTR / Receipt No
                </label>
                <input
                  type="text"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  placeholder="e.g., UPI-894029103"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-800 focus:ring-2 focus:ring-[#F26522]/30 focus:border-[#F26522] outline-none"
                />
              </div>

              {/* Payment Mode */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Payment Mode
                </label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:ring-2 focus:ring-[#F26522]/30 focus:border-[#F26522] outline-none"
                >
                  <option value="UPI">UPI / QR Code</option>
                  <option value="NET_BANKING">Net Banking / NEFT</option>
                  <option value="CORPORATE_CARD">Corporate Credit / Debit Card</option>
                  <option value="CASH">Cash Voucher (Accounts)</option>
                </select>
              </div>

              {/* Recharge Date */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Recharge Execution Date
                </label>
                <input
                  type="date"
                  value={rechargeDate}
                  onChange={(e) => handleRechargeDateChange(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-800 focus:ring-2 focus:ring-[#F26522]/30 focus:border-[#F26522] outline-none"
                />
              </div>

              {/* Computed New Expiry Date */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>New Valid-Till Expiry Date</span>
                  <span className="text-[10px] text-emerald-600 font-bold">Auto-Computed</span>
                </label>
                <input
                  type="date"
                  required
                  value={newExpiryDate}
                  onChange={(e) => setNewExpiryDate(e.target.value)}
                  className="w-full px-3 py-2 bg-emerald-50/70 border border-emerald-300 rounded-xl font-mono font-bold text-emerald-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              {/* Notes */}
              <div className="col-span-1 sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Accounting Notes / Department Allocation Reason
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g., Monthly renewal cleared by Principal office for IT wing"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-[#F26522]/30 focus:border-[#F26522] outline-none"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
              <div className="flex items-center space-x-1.5 text-slate-500 text-[11px]">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Recorded in financial audit ledger</span>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-[#F26522] hover:bg-orange-600 text-white font-bold text-xs transition shadow-md shadow-orange-500/20 flex items-center space-x-1.5 disabled:opacity-50"
                >
                  {submitting && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  <span>Confirm & Record Recharge</span>
                </button>
              </div>
            </div>
          </form>
        )}

        {/* TAB 2: AUDIT HISTORY */}
        {activeTab === 'history' && (
          <div className="space-y-3">
            {loadingHistory ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                <div className="w-6 h-6 border-2 border-[#F26522] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                Loading recharge history...
              </div>
            ) : history.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs font-medium">
                No past recharge records found for this asset.
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase text-slate-500">
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Amount</th>
                      <th className="py-2.5 px-3">Validity</th>
                      <th className="py-2.5 px-3">Expiry Date</th>
                      <th className="py-2.5 px-3">Transaction / Mode</th>
                      <th className="py-2.5 px-3">Recorded By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {history.map((rec) => (
                      <tr key={rec.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-700">
                          {new Date(rec.rechargeDate).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="py-2.5 px-3 font-extrabold text-[#F26522]">
                          ₹{Number(rec.amount).toLocaleString('en-IN')}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-600">
                          {rec.validityDays} Days
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-emerald-700">
                          {new Date(rec.newExpiryDate).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-mono text-[10.5px] text-slate-700 font-semibold">{rec.transactionId || '—'}</div>
                          <div className="text-[10px] text-slate-400">{rec.paymentMode}</div>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-slate-800">{rec.createdBy?.name || 'System Admin'}</div>
                          <div className="text-[9.5px] text-slate-400">{rec.createdBy?.role || 'STAFF'}</div>
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
    </Modal>
  );
};
