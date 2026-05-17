import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ⚠️ Remplace par ton URL o2switch en production
const BASE_URL = __DEV__
  ? 'http://192.168.1.X:3000/api'  // Ton IP locale en dev
  : 'https://ton-domaine.com/api'; // Ton domaine o2switch

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
