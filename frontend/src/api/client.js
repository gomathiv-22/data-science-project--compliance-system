/**
 * src/api/client.js
 * Centralized Axios instance with JWT interceptors.
 */

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://gomathi2218.pythonanywhere.com/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 45000,
});

// Attach JWT token to every protected request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Global response error handler
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token on 401 Unauthorized
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // If not already on auth page, redirect
      if (!window.location.pathname.startsWith('/login') && window.location.pathname !== '/') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
