import { api, unwrap } from './client';
import { AttendanceRecord } from '../types';

export const attendanceAPI = {
  mark: (data: { courseId: string; date: string; attendance: AttendanceRecord[] }) =>
    api.post('/attendance/mark', data).then((r) => unwrap(r.data)),

  update: (data: { courseId: string; date: string; attendance: AttendanceRecord[] }) =>
    api.put('/attendance/update', data).then((r) => unwrap(r.data)),

  getByDate: (courseId: string, date: string) =>
    api.get(`/attendance/${courseId}`, { params: { date } }).then((r) => unwrap(r.data)),

  deleteByDate: (courseId: string, date: string) =>
    api.delete(`/attendance/${courseId}`, { params: { date } }).then((r) => r.data),

  getDays: (courseId: string) => api.get(`/attendance/${courseId}/days`).then((r) => unwrap(r.data)),
};
