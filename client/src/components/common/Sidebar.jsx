import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Laptop,
  ArrowLeftRight,
  Users,
  GraduationCap,
  UserCheck,
  Receipt,
  Wrench,
  History,
  FileSpreadsheet,
  X,
  Gift,
  Sliders,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';

/**
 * Sidebar Navigation Component
 * Provides clean access to core modules with role-based navigation guards.
 * Features:
 * - Smooth Collapse / Expand toggle between 64 (expanded) and 20 (collapsed mini-bar).
 * - Merged "Users" top-level item with interactive hover & click dropdown in expanded mode,
 *   and floating popover flyout in collapsed mode.
 * - Tooltip previews for all icons in collapsed mode.
 * - Perfectly scaled institutional branding in an 80px (h-20) header.
 *
 * @param {boolean} isOpen - Controls visibility on mobile viewports
 * @param {function} onClose - Callback to dismiss sidebar on mobile navigation
 * @param {boolean} isCollapsed - Controls desktop collapsed state
 * @param {function} onToggleCollapse - Callback to toggle desktop collapsed state
 */
export const Sidebar = ({ isOpen, onClose, isCollapsed = false, onToggleCollapse }) => {
  const { isHigherManagement, isStaff, isSuperAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Check if current route is under Users module
  const isUsersActive =
    location.pathname.startsWith('/students') ||
    location.pathname.startsWith('/staff') ||
    location.pathname.startsWith('/users');

  // Interactive hover & click dropdown state for Users tab in expanded mode
  const [usersDropdownOpen, setUsersDropdownOpen] = useState(isUsersActive);
  // Flyout state for Users tab in collapsed mode
  const [collapsedUsersFlyoutOpen, setCollapsedUsersFlyoutOpen] = useState(false);

  // Standard navigation route configuration
  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Laptop Inventory', path: '/inventory', icon: Laptop },
    { name: 'Issue / Return History', path: '/allocations', icon: ArrowLeftRight },
    // "Users" is rendered as a merged dropdown component below
    { name: 'Donors & Purchases', path: '/donors', icon: Gift },
    { name: 'License Fee Tracker', path: '/fees', icon: Receipt },
    { name: 'Repairs & Upgrades', path: '/maintenance', icon: Wrench },
    // Governance routes restricted to Dean / Auditor / Super Admin
    ...(isHigherManagement ? [{ name: 'Audit Trail', path: '/audit-logs', icon: History }] : []),
    // Management routes restricted to Inventory Staff / Super Admin
    ...(isStaff ? [{ name: 'Data Import / Export', path: '/import-export', icon: FileSpreadsheet }] : []),
    // Dynamic Master Settings restricted to Super Admin
    ...(isSuperAdmin ? [{ name: 'Master Settings', path: '/settings', icon: Sliders }] : []),
  ];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Main Sidebar Drawer */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 bg-[#F1F5F9] border-r border-slate-200 text-slate-700 flex flex-col transition-all duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } ${isCollapsed ? 'lg:w-20' : 'lg:w-64'} w-64`}
      >
        {/* Top Header: Exactly h-20 (80px) matching Navbar height */}
        <div className="h-20 flex items-center justify-between px-3.5 sm:px-4 border-b border-slate-200 bg-white relative">
          {/* Logo container */}
          <div
            className={`flex items-center transition-all duration-300 ${
              isCollapsed ? 'lg:justify-center lg:w-full' : 'justify-start space-x-2'
            }`}
          >
            <img
              src="/Logo/SSISM_IMS.png"
              alt="SSISM Logo"
              className={`object-contain transition-all duration-300 hover:scale-105 ${
                isCollapsed ? 'lg:max-h-9 lg:w-auto max-h-12' : 'max-h-12 w-auto'
              }`}
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = '/Logo/SSISM_IMS.png';
              }}
            />
          </div>

          {/* Desktop Collapse / Expand Toggle Button in Header */}
          {onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-[#F26522] hover:bg-orange-50 transition"
            >
              {isCollapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )}
            </button>
          )}

          {/* Mobile close trigger */}
          <button
            onClick={onClose}
            aria-label="Close sidebar"
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 ml-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items List */}
        <nav className="flex-1 px-2.5 sm:px-3 py-4 space-y-1.5 overflow-y-auto">
          {/* Items before Users */}
          {navItems.slice(0, 3).map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center rounded-xl text-[13.5px] font-bold transition-all duration-150 relative group ${
                    isCollapsed
                      ? 'lg:justify-center lg:p-2.5 px-3.5 py-2.5 space-x-3'
                      : 'px-3.5 py-2.5 space-x-3'
                  } ${
                    isActive
                      ? 'bg-[#F26522] text-white shadow-md shadow-orange-500/25 ring-1 ring-orange-500'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                  }`
                }
              >
                <Icon className={`${isCollapsed ? 'w-5 h-5' : 'w-[18px] h-[18px]'} flex-shrink-0`} />
                <span className={isCollapsed ? 'lg:hidden' : ''}>{item.name}</span>

                {/* Floating tooltip in collapsed desktop mode */}
                {isCollapsed && (
                  <div className="hidden lg:group-hover:flex absolute left-full ml-3 px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg shadow-xl z-50 whitespace-nowrap pointer-events-none items-center">
                    {item.name}
                  </div>
                )}
              </NavLink>
            );
          })}

          {/* Unified "Users" Navigation Item */}
          {isCollapsed ? (
            /* Collapsed Desktop Mode: Icon with Floating Flyout on Hover / Click */
            <div
              className="relative group"
              onMouseEnter={() => setCollapsedUsersFlyoutOpen(true)}
              onMouseLeave={() => setCollapsedUsersFlyoutOpen(false)}
            >
              <button
                type="button"
                id="users-nav-collapsed"
                onClick={() => setCollapsedUsersFlyoutOpen((prev) => !prev)}
                className={`w-full flex items-center justify-center p-2.5 rounded-xl text-[13.5px] font-bold transition-all duration-150 ${
                  isUsersActive
                    ? 'bg-orange-500/15 text-[#F26522] ring-1 ring-orange-400/50'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                }`}
                title="Users Directory"
              >
                <Users className={`w-5 h-5 flex-shrink-0 ${isUsersActive ? 'text-[#F26522]' : ''}`} />
              </button>

              {/* Floating Flyout Menu */}
              {collapsedUsersFlyoutOpen && (
                <div className="hidden lg:block absolute left-full top-0 ml-3 w-52 bg-white border border-slate-200 rounded-xl shadow-xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-2.5 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1">
                    Users Directory
                  </div>
                  <NavLink
                    to="/users?role=faculty"
                    onClick={() => {
                      setCollapsedUsersFlyoutOpen(false);
                      onClose();
                    }}
                    className={() => {
                      const isFacultyActive =
                        location.pathname === '/staff' ||
                        (location.pathname === '/users' && location.search.includes('role=faculty'));
                      return `flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                        isFacultyActive
                          ? 'bg-[#F26522] text-white shadow-sm'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`;
                    }}
                  >
                    <UserCheck className="w-4 h-4 flex-shrink-0" />
                    <span>Faculty & Staff</span>
                  </NavLink>
                  <NavLink
                    to="/users?role=student"
                    onClick={() => {
                      setCollapsedUsersFlyoutOpen(false);
                      onClose();
                    }}
                    className={() => {
                      const isStudentActive =
                        location.pathname === '/students' ||
                        (location.pathname === '/users' && !location.search.includes('role=faculty'));
                      return `flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                        isStudentActive
                          ? 'bg-[#F26522] text-white shadow-sm'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`;
                    }}
                  >
                    <GraduationCap className="w-4 h-4 flex-shrink-0" />
                    <span>Students</span>
                  </NavLink>
                </div>
              )}
            </div>
          ) : (
            /* Expanded Mode: Interactive Hover & Click Dropdown */
            <div
              className="relative"
              onMouseEnter={() => setUsersDropdownOpen(true)}
              onMouseLeave={() => {
                if (!isUsersActive) {
                  setUsersDropdownOpen(false);
                }
              }}
            >
              <button
                type="button"
                id="users-nav-dropdown"
                onClick={() => {
                  setUsersDropdownOpen((prev) => !prev);
                  if (!isUsersActive) {
                    navigate('/users?role=student');
                  }
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-[13.5px] font-bold transition-all duration-150 ${
                  isUsersActive
                    ? 'bg-orange-500/10 text-[#F26522] border border-orange-200/80 shadow-2xs font-extrabold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Users className={`w-[18px] h-[18px] flex-shrink-0 ${isUsersActive ? 'text-[#F26522]' : ''}`} />
                  <span>Users</span>
                </div>
                <ChevronDown
                  className={`w-4 h-4 transition-transform duration-200 ${
                    usersDropdownOpen ? 'rotate-180 text-[#F26522]' : 'text-slate-400'
                  }`}
                />
              </button>

              {/* Dropdown Menu (Faculty & Students Options) */}
              {usersDropdownOpen && (
                <div className="mt-1 pl-4 pr-1 py-1 space-y-1 bg-white/60 rounded-xl border border-slate-200/60 transition-all duration-150">
                  {/* Option 1: Faculty */}
                  <NavLink
                    to="/users?role=faculty"
                    onClick={onClose}
                    className={() => {
                      const isFacultyActive =
                        location.pathname === '/staff' ||
                        (location.pathname === '/users' && location.search.includes('role=faculty'));
                      return `flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-bold transition-all duration-150 ${
                        isFacultyActive
                          ? 'bg-[#F26522] text-white shadow-sm shadow-orange-500/25 ring-1 ring-orange-500'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`;
                    }}
                  >
                    <UserCheck className="w-4 h-4 flex-shrink-0" />
                    <span>Faculty & Staff</span>
                  </NavLink>

                  {/* Option 2: Students */}
                  <NavLink
                    to="/users?role=student"
                    onClick={onClose}
                    className={() => {
                      const isStudentActive =
                        location.pathname === '/students' ||
                        (location.pathname === '/users' && !location.search.includes('role=faculty'));
                      return `flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-bold transition-all duration-150 ${
                        isStudentActive
                          ? 'bg-[#F26522] text-white shadow-sm shadow-orange-500/25 ring-1 ring-orange-500'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`;
                    }}
                  >
                    <GraduationCap className="w-4 h-4 flex-shrink-0" />
                    <span>Students</span>
                  </NavLink>
                </div>
              )}
            </div>
          )}

          {/* Remaining Items (Donors, Fees, Maintenance, Audit, Settings) */}
          {navItems.slice(3).map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center rounded-xl text-[13.5px] font-bold transition-all duration-150 relative group ${
                    isCollapsed
                      ? 'lg:justify-center lg:p-2.5 px-3.5 py-2.5 space-x-3'
                      : 'px-3.5 py-2.5 space-x-3'
                  } ${
                    isActive
                      ? 'bg-[#F26522] text-white shadow-md shadow-orange-500/25 ring-1 ring-orange-500'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                  }`
                }
              >
                <Icon className={`${isCollapsed ? 'w-5 h-5' : 'w-[18px] h-[18px]'} flex-shrink-0`} />
                <span className={isCollapsed ? 'lg:hidden' : ''}>{item.name}</span>

                {/* Floating tooltip in collapsed desktop mode */}
                {isCollapsed && (
                  <div className="hidden lg:group-hover:flex absolute left-full ml-3 px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg shadow-xl z-50 whitespace-nowrap pointer-events-none items-center">
                    {item.name}
                  </div>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Footer Institutional Badge */}
        <div className="p-3 border-t border-slate-200 bg-white/60">
          {isCollapsed ? (
            <div
              className="hidden lg:flex items-center justify-center p-2 rounded-xl bg-slate-50 border border-slate-200 text-center cursor-default group relative"
              title="Sant Singaji Institute of Science & Management"
            >
              <span className="text-[11px] font-extrabold text-[#F26522] tracking-wider font-mono">
                SSISM
              </span>
              <div className="hidden group-hover:flex absolute left-full ml-3 px-2.5 py-1 bg-slate-900 text-white text-[11px] font-semibold rounded-lg shadow-xl z-50 whitespace-nowrap pointer-events-none">
                SSISM Sandalpur
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-center">
              <div className="text-[11px] font-extrabold text-slate-800">Sant Singaji Institute</div>
              <p className="text-[10px] text-slate-500 mt-0.5">Science & Management Campus</p>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
