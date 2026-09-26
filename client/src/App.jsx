import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/common/Navbar';
import { Sidebar } from './components/common/Sidebar';

// Route-level page components
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Inventory } from './pages/Inventory';
import { AssetDetail } from './pages/AssetDetail';
import { Allocations } from './pages/Allocations';
import { Students } from './pages/Students';
import { StaffDirectory } from './pages/StaffDirectory';
import { Users } from './pages/Users';
import { LicenseFees } from './pages/LicenseFees';
import { MaintenanceLogs } from './pages/MaintenanceLogs';
import { AuditLogs } from './pages/AuditLogs';
import { ImportExport } from './pages/ImportExport';
import { Donors } from './pages/Donors';
import { Settings } from './pages/Settings';

/**
 * Protected Layout Component
 * Enforces session authentication guards, renders persistent navigation (Navbar & Sidebar),
 * and provides responsive layout shells for authorized viewports.
 */
const AppLayout = () => {
  const { isAuthenticated, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      return localStorage.getItem('ssism_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('ssism_sidebar_collapsed', String(next));
      } catch {
        // ignore local storage errors
      }
      return next;
    });
  };

  // Application initialization and session verification spinner
  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-900">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-[#F26522] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-bold text-slate-300 tracking-wider">SSISM PORTAL INITIALIZING...</p>
        </div>
      </div>
    );
  }

  // Redirect unauthenticated visitors to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex">
      {/* Persistent Left Sidebar Navigation */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isCollapsed={isCollapsed}
        onToggleCollapse={toggleCollapse}
      />

      {/* Main Viewport Content Area */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out ${
          isCollapsed ? 'lg:pl-20' : 'lg:pl-64'
        }`}
      >
        <Navbar
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
          isCollapsed={isCollapsed}
          onToggleCollapse={toggleCollapse}
        />
        <main className="flex-1 p-4 sm:p-5 lg:p-6 max-w-[1600px] w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

/**
 * Root Application Router & Context Provider
 */
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Portal Authentication Route */}
          <Route path="/login" element={<Login />} />

          {/* Authenticated Campus Management Routes */}
          <Route element={<AppLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/inventory/:id" element={<AssetDetail />} />
            <Route path="/allocations" element={<Allocations />} />
            <Route path="/users" element={<Users />} />
            <Route path="/students" element={<Navigate to="/users?role=student" replace />} />
            <Route path="/staff" element={<Navigate to="/users?role=faculty" replace />} />
            <Route path="/users/students" element={<Navigate to="/users?role=student" replace />} />
            <Route path="/users/faculty" element={<Navigate to="/users?role=faculty" replace />} />
            <Route path="/fees" element={<LicenseFees />} />
            <Route path="/maintenance" element={<MaintenanceLogs />} />
            <Route path="/donors" element={<Donors />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/audit-logs" element={<AuditLogs />} />
            <Route path="/import-export" element={<ImportExport />} />
          </Route>

          {/* Fallback Redirection Route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
