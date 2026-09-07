import { api, unwrap } from './client';
import { Notification } from '../types';

export const notificationsAPI = {
  getAll: () => api.get('/notifications').then((r) => unwrap<{ notifications: Notification[]; unread: number }>(r.data)),
  markRead: (id: string) => api.put(`/notifications/${id}/read`).then((r) => r.data),
  markAllRead: () => api.put('/notifications/read-all').then((r) => r.data),
};
