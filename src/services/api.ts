import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

export const auth = {
  register: (data: any) => api.post('/auth/register', data),
  login: (data: any) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token: string, new_password: string) => api.post('/auth/reset-password', { token, new_password }),
};

export const applications = {
  list: () => api.get('/applications'),
  create: (data: any) => api.post('/applications', data),
  get: (id: number) => api.get(`/applications/${id}`),
  updateStatus: (id: number, status: string) => api.patch(`/applications/${id}/status`, { status }),
  uploadDocument: (formData: FormData) => api.post('/documents/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
};

export const notifications = {
  getLogs: () => api.get('/notifications/logs'),
  getTemplates: () => api.get('/notifications/templates'),
  updateTemplate: (id: number, data: any) => api.put(`/notifications/templates/${id}`, data),
};

export default api;
