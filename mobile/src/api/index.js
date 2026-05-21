import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'https://gluglu-backend.ninoguinberteau.fr/api';

const api = axios.create({ baseURL: BASE_URL });

// Injecte le token JWT ET la langue préférée dans chaque requête
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  const lang = await AsyncStorage.getItem('app_language') || 'fr';
  config.headers['x-app-language'] = lang;
  return config;
});

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data) => api.put('/auth/profile', data),
  searchUsers: (q) => api.get(`/auth/search?q=${encodeURIComponent(q)}`),
};

export const productsAPI = {
  scan: (barcode) => api.post('/products/scan', { barcode }),
};

export const scansAPI = {
  getHistory: (limit = 20, offset = 0) =>
    api.get(`/scans/history?limit=${limit}&offset=${offset}`),
  deleteScan: (id) => api.delete(`/scans/${id}`),
};

export const familyAPI = {
  getFamily: () => api.get('/family'),
  addMember: (data) => api.post('/family', data),
  updateMember: (id, data) => api.put(`/family/${id}`, data),
  deleteMember: (id) => api.delete(`/family/${id}`),
  invite: (email) => api.post('/family/invite', { email }),
  getInvitations: () => api.get('/family/invitations'),
  acceptInvitation: (id) => api.post(`/family/invitations/${id}/accept`),
  declineInvitation: (id) => api.post(`/family/invitations/${id}/decline`),
};

export const groupsAPI = {
  getGroups: () => api.get('/groups'),
  createGroup: (name) => api.post('/groups', { name }),
  getGroup: (id) => api.get(`/groups/${id}`),
  invite: (id, username) => api.post(`/groups/${id}/invite`, { username }),
  getPendingInvitations: () => api.get('/groups/invitations/pending'),
  acceptInvitation: (memberId) => api.post(`/groups/invitations/${memberId}/accept`),
  declineInvitation: (memberId) => api.post(`/groups/invitations/${memberId}/decline`),
  setActive: (id) => api.put(`/groups/${id}/setActive`),
  removeMember: (groupId, userId) => api.delete(`/groups/${groupId}/members/${userId}`),
  deleteGroup: (id) => api.delete(`/groups/${id}`),
};

export default api;
