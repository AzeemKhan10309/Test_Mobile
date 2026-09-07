import { api, unwrap } from './client';
import { AuthResponse, User } from '../types';

export const authAPI = {
  registerStudent: (data: {
    name: string; studentId: string; password: string;
    gender?: string; personalPhone?: string; guardianPhone?: string; area?: string;
  }) => api.post('/auth/register/student', data).then((r) => unwrap<AuthResponse>(r.data)),

  registerTeacher: (data: { name: string; email: string; password: string }) =>
    api.post('/auth/register/teacher', data).then((r) => unwrap<AuthResponse>(r.data)),

  login: (data: { email?: string; studentId?: string; password: string }) =>
    api.post('/auth/login', data).then((r) => unwrap<AuthResponse>(r.data)),

  refresh: () => api.post('/auth/refresh').then((r) => unwrap<{ accessToken: string }>(r.data)),

  logout: () => api.post('/auth/logout').then((r) => r.data),

  me: () => api.get('/auth/me').then((r) => unwrap<User>(r.data)),

  forgotPassword: (data: { email?: string; studentId?: string }) =>
    api.post('/auth/forgot-password', data).then((r) => r.data),

  resetPassword: (data: { email?: string; studentId?: string; code: string; newPassword: string }) =>
    api.post('/auth/reset-password', data).then((r) => r.data),
};
