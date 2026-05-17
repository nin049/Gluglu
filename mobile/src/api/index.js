import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'https://gluglu-backend.ninoguinberteau.fr/api';

const api = axios.create({ baseURL: BASE_URL });

// Injecte le token JWT dans chaque requête
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data) => api.put('/auth/profile', data),
};

export const productsAPI = {
  scan: (barcode) => api.post('/products/scan', { barcode }),
};

export const scansAPI = {
  getHistory: (limit = 20, offset = 0) =>
    api.get(`/scans/history?limit=${limit}&offset=${offset}`),
  deleteScan: (id) => api.delete(`/scans/${id}`),
};

export default api;
