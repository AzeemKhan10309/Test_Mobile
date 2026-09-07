import { api, unwrap } from './client';
import { Announcement } from '../types';

export const announcementsAPI = {
  create: (data: { title: string; message: string; courseId: string }) =>
    api.post('/announcements/create', data).then((r) => unwrap<Announcement>(r.data)),

  getByCourse: (courseId: string) => api.get(`/announcements/${courseId}`).then((r) => unwrap<Announcement[]>(r.data)),

  update: (id: string, data: { title?: string; message?: string }) =>
    api.patch(`/announcements/${id}`, data).then((r) => unwrap<Announcement>(r.data)),

  delete: (id: string) => api.delete(`/announcements/${id}`).then((r) => r.data),

  markRead: (id: string) => api.patch(`/announcements/${id}/read`).then((r) => r.data),
};
