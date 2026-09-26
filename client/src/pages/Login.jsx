import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, ArrowRight, KeyRound } from 'lucide-react';

/**
 * Authentication Portal Page
 * Features Sant Singaji Institute branding, JWT HTTP-Only authentication,
 * and a convenient one-click role switcher for demo and evaluation workflows.
 */
export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  // Handle user authentication request
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid email or password credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to pre-populate credentials for evaluator testing
  const fillCredentials = (demoEmail, demoPass) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError('');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center py-12 sm:px-6 lg:px-8 px-4">
      {/* College Logo & Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex p-3 rounded-2xl bg-white shadow-xs border border-slate-200 mb-3">
          <img
            src="../Logo/SSISM_IMS.png"
            alt="SSISM Logo"
            className="h-14 w-auto max-w-[240px] object-contain"
            onError={(e) => {
              // Fallback to public folder path if relative link fails
              e.target.onerror = null;
              e.target.src = '/Logo/SSISM_IMS.png';
            }}
          />
        </div>
        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
          Sant Singaji Institute of Science & Management
        </h2>
        <p className="mt-1 text-xs font-bold text-[#F26522] uppercase tracking-wider">
          Asset & Inventory Management Portal
        </p>
      </div>

      {/* Main Authentication Card */}
      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xs rounded-xl sm:px-10 border border-slate-200">
          {/* Error Banner */}
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Address */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Campus Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. staff@ssism.edu"
                  required
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#F26522] focus:ring-2 focus:ring-orange-500/20 text-xs outline-none text-slate-800 transition"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#F26522] focus:ring-2 focus:ring-orange-500/20 text-xs outline-none text-slate-800 transition"
                />
              </div>
            </div>

            {/* Submit Action */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl text-white font-bold bg-[#F26522] hover:bg-orange-600 active:scale-[0.99] transition shadow-md shadow-orange-500/25 flex items-center justify-center space-x-2 disabled:opacity-50 text-xs"
              >
                <span>{loading ? 'Authenticating...' : 'Sign In to Portal'}</span>
                {!loading && <ArrowRight className="w-4 h-4" />}
              </button>
            </div>
          </form>

          {/* Quick One-Click Role Switcher */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <p className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 mb-2 text-center flex items-center justify-center space-x-1">
              <KeyRound className="w-3.5 h-3.5 text-[#F26522]" />
              <span>One-Click Role Switcher (Demo)</span>
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => fillCredentials('superadmin@ssism.edu', 'Admin@123')}
                className="px-2.5 py-2 rounded-lg bg-slate-50 hover:bg-orange-50 text-slate-800 font-semibold border border-slate-200 hover:border-orange-300 transition text-left"
              >
                <div className="font-bold text-[10.5px] text-slate-900">Super Admin</div>
                <div className="text-[9.5px] text-slate-500 truncate">superadmin@ssism.edu</div>
              </button>

              <button
                type="button"
                onClick={() => fillCredentials('staff@ssism.edu', 'Staff@123')}
                className="px-2.5 py-2 rounded-lg bg-slate-50 hover:bg-orange-50 text-slate-800 font-semibold border border-slate-200 hover:border-orange-300 transition text-left"
              >
                <div className="font-bold text-[10.5px] text-[#F26522]">Inventory Staff</div>
                <div className="text-[9.5px] text-slate-500 truncate">staff@ssism.edu</div>
              </button>

              <button
                type="button"
                onClick={() => fillCredentials('accountant@ssism.edu', 'Staff@123')}
                className="px-2.5 py-2 rounded-lg bg-slate-50 hover:bg-orange-50 text-slate-800 font-semibold border border-slate-200 hover:border-orange-300 transition text-left"
              >
                <div className="font-bold text-[10.5px] text-emerald-700">Accounts / Fees</div>
                <div className="text-[9.5px] text-slate-500 truncate">accountant@ssism.edu</div>
              </button>

              <button
                type="button"
                onClick={() => fillCredentials('auditor@ssism.edu', 'Dean@123')}
                className="px-2.5 py-2 rounded-lg bg-slate-50 hover:bg-orange-50 text-slate-800 font-semibold border border-slate-200 hover:border-orange-300 transition text-left"
              >
                <div className="font-bold text-[10.5px] text-amber-700">Auditor / Dean</div>
                <div className="text-[9.5px] text-slate-500 truncate">auditor@ssism.edu</div>
              </button>
            </div>
          </div>
        </div>

        {/* Institutional Campus Footer */}
        <p className="mt-6 text-center text-[11px] text-slate-500 font-medium">
          Shri Shivaji Institute of Science & Management • Sandalpur Campus
        </p>
      </div>
    </div>
  );
};
