import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { GlobalSearch } from './GlobalSearch';
import { LogOut, Menu, PanelLeftClose, PanelLeftOpen } from 'lucide-react';

/**
 * Navbar Component
 * 
 * Top navigation bar of the SSISM IMS portal.
 * Provides global real-time asset searching, mobile sidebar toggle,
 * user identity pill (showing role badge, department, and roll/emp ID),
 * and quick logout trigger.
 * 
 * @param {Object} props
 * @param {Function} props.onToggleSidebar - Handler to toggle mobile sidebar drawer
 * @param {boolean} props.isCollapsed - Desktop sidebar collapse state
 * @param {Function} props.onToggleCollapse - Handler to toggle desktop sidebar collapse
 */
export const Navbar = ({ onToggleSidebar, isCollapsed, onToggleCollapse }) => {
  const { user, logout } = useAuth();

  // Role badge color scheme mapping
  const roleColors = {
    SUPER_ADMIN: 'bg-purple-100 text-purple-700 border-purple-200',
    STAFF: 'bg-orange-100 text-orange-700 border-orange-200',
    HIGHER_MANAGEMENT: 'bg-amber-100 text-amber-700 border-amber-200',
    FACULTY: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    STUDENT: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  return (
    <header className="sticky top-0 z-40 h-20 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-6 lg:px-8 flex items-center transition-all">
      <div className="flex items-center justify-between gap-4 w-full">
        {/* Left: Desktop/Mobile Sidebar toggle, Mobile Logo & Global Search Bar */}
        <div className="flex items-center gap-2.5">
          {/* Mobile Drawer Toggle */}
          <button
            onClick={onToggleSidebar}
            aria-label="Toggle Navigation Menu"
            className="lg:hidden p-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Desktop Sidebar Collapse Toggle */}
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            title={isCollapsed ? 'Expand Sidebar (Ctrl/Cmd + B)' : 'Collapse Sidebar'}
            className="hidden lg:flex p-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-[#F26522] transition items-center justify-center border border-slate-200/60 bg-slate-50/50"
          >
            {isCollapsed ? (
              <PanelLeftOpen className="w-4 h-4" />
            ) : (
              <PanelLeftClose className="w-4 h-4" />
            )}
          </button>

          {/* Mobile Brand Logo */}
          <div className="lg:hidden flex items-center">
            <img
              src="/Logo/SSISM_IMS.png"
              alt="SSISM Logo"
              className="h-10 w-auto object-contain max-w-[130px]"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = '/Logo/SSISM_IMS.png';
              }}
            />
          </div>

          {/* Quick Search */}
          <div className="w-56 sm:w-80 md:w-96">
            <GlobalSearch />
          </div>
        </div>

        {/* Right: User Profile & Actions */}
        <div className="flex items-center space-x-3">
          {/* User Profile Pill (Simplified: Only Name and Role) */}
          <div className="flex items-center space-x-2.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="w-7 h-7 rounded-lg bg-[#F26522] text-white flex items-center justify-center font-extrabold text-xs shadow-xs shrink-0">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="text-xs font-semibold text-slate-800 whitespace-nowrap">
              <span className="font-bold text-slate-900">{user?.name || 'User'}</span>
              <span className="mx-1.5 text-slate-400 font-normal">|</span>
              <span className="text-[#F26522] font-bold">
                {user?.role === 'SUPER_ADMIN'
                  ? 'Admin'
                  : user?.role === 'HIGHER_MANAGEMENT'
                  ? 'Management'
                  : user?.role
                  ? user.role.charAt(0) + user.role.slice(1).toLowerCase().replace(/_/g, ' ')
                  : 'User'}
              </span>
            </div>
          </div>

          {/* Logout Button */}
          <button
            onClick={logout}
            title="Sign Out"
            className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};

