import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

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

export const authAPI = {
  register: (userData) => api.post('/auth/register', userData),
  login: (credentials) => api.post('/auth/login', credentials),
};

export const typingAPI = {
  getParagraph: () => api.get('/paragraph'),
  saveResult: (result) => api.post('/typing-result', result),
  getHistory: (page = 1, limit = 10) => api.get(`/typing-history?page=${page}&limit=${limit}`),
  getStats: () => api.get('/user-stats'),
  getLeaderboard: (limit = 10) => api.get(`/leaderboard?limit=${limit}`),
};

export default api; 