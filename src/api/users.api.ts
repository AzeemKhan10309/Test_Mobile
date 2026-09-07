import { api, unwrap } from './client';
import { User } from '../types';

export const usersAPI = {
  getProfile: () => api.get('/users/profile').then((r) => unwrap<User>(r.data)),

  // Editable fields per contract: name, darkMode, language for everyone;
  // students may additionally send personalPhone, guardianPhone, area.
  updateProfile: (data: Partial<Pick<User, 'name' | 'darkMode' | 'language' | 'personalPhone' | 'guardianPhone' | 'area'>>) =>
    api.put('/users/profile', data).then((r) => unwrap<User>(r.data)),

  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.put('/users/change-password', data).then((r) => r.data),
};
