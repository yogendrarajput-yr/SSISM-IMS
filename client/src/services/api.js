import axios from 'axios';

/**
 * Axios API Client Instance
 * Configured with base URL, JSON headers, and credentials support for HTTP-Only cookies.
 */
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Send HTTP-Only session cookies automatically
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Global Response Interceptor
 * Intercepts 401 Unauthorized responses to transparently attempt a refresh token exchange.
 * If token refreshing succeeds, retries original request; otherwise redirects to /login.
 */
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Guard against infinite retry loops on authentication endpoints
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url.includes('/auth/login') &&
      !originalRequest.url.includes('/auth/refresh')
    ) {
      originalRequest._retry = true;
      try {
        await api.post('/auth/refresh');
        return api(originalRequest);
      } catch (refreshErr) {
        // Refresh token invalid or expired: force redirect to login
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshErr);
      }
    }

    return Promise.reject(error);
  }
);

/**
 * Authenticated file downloader for Excel spreadsheets, PDF receipts, and templates.
 * 
 * @param {string} url - API endpoint relative to baseURL or absolute
 * @param {string} filename - Target filename for local download save
 */
export const downloadFile = async (url, filename) => {
  try {
    const response = await api.get(url, { responseType: 'blob' });
    const blob = new Blob([response.data]);
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
  } catch (err) {
    console.error('File download failed:', err);
    throw err;
  }
};

