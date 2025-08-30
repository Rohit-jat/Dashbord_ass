import axios from 'axios';

// Create axios instance
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle authentication errors
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    
    // Handle network errors
    if (!error.response) {
      console.error('Network error:', error.message);
      return Promise.reject(new Error('Network error. Please check your connection.'));
    }
    
    // Handle server errors
    if (error.response?.status >= 500) {
      console.error('Server error:', error.response.data);
      return Promise.reject(new Error('Server error. Please try again later.'));
    }
    
    return Promise.reject(error);
  }
);

// API endpoints
export const endpoints = {
  // Auth
  auth: {
    google: '/api/auth/google',
    status: '/api/auth/status',
    logout: '/api/auth/logout',
  },
  
  // User
  user: {
    profile: '/api/user/profile',
    stats: '/api/user/stats',
    search: '/api/user/search',
  },
  
  // Data
  data: {
    create: '/api/data',
    list: '/api/data',
    get: (id) => `/api/data/${id}`,
    update: (id) => `/api/data/${id}`,
    delete: (id) => `/api/data/${id}`,
    stats: '/api/data/stats/summary',
  },
};

// Helper functions
export const apiHelpers = {
  // Handle API errors
  handleError: (error) => {
    if (error.response?.data?.error) {
      return error.response.data.error;
    }
    if (error.response?.data?.message) {
      return error.response.data.message;
    }
    return error.message || 'An error occurred';
  },
  
  // Format query parameters
  formatQuery: (params) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, value);
      }
    });
    return searchParams.toString();
  },
  
  // Pagination helper
  getPaginationParams: (page = 1, limit = 10) => ({
    page,
    limit,
  }),
  
  // Search helper
  getSearchParams: (search, filters = {}) => ({
    search,
    ...filters,
  }),
};

export default api;
