import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

/**
 * Authentication Context for SSISM IMS
 * Manages global user state, token refresh lifecycle, and role-based helper flags.
 */
const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Verify active user session on app initialization
  const checkAuth = async () => {
    try {
      const res = await api.get('/auth/me');
      if (res.data?.data?.user) {
        setUser(res.data.data.user);
      }
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  // Authenticate user credentials and store session state
  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    if (res.data?.data?.user) {
      setUser(res.data.data.user);
      return res.data.data.user;
    }
    throw new Error('Login failed');
  };

  // Terminate session, clear HTTP-Only cookies, and redirect
  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setUser(null);
      window.location.href = '/login';
    }
  };

  // Role verification helper flags
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isStaff = user?.role === 'STAFF' || isSuperAdmin;
  const isHigherManagement = user?.role === 'HIGHER_MANAGEMENT' || isSuperAdmin;

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        isSuperAdmin,
        isStaff,
        isHigherManagement,
        login,
        logout,
        checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook for accessing authentication context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
