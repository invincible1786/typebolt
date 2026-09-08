import axios from 'axios';

const getApiBaseUrl = () => {
  if (typeof process !== 'undefined' && process.env && process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  return '/api';
};

const API_BASE_URL = getApiBaseUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Intercept 401 and 403 responses to clear invalid tokens and redirect to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (userData) => api.post('/auth/register', userData),
  login: (credentials) => api.post('/auth/login', credentials),
};

export const typingAPI = {
  getParagraph: (category = 'prose') => api.get(`/paragraph?category=${category}`),
  saveResult: (result) => api.post('/typing-result', result),
  getHistory: (page = 1, limit = 10) => api.get(`/typing-history?page=${page}&limit=${limit}`),
  getStats: () => api.get('/user-stats'),
  getLeaderboard: (limit = 10) => api.get(`/leaderboard?limit=${limit}`),
};

export default api;
