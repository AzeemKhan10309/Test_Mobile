import { api, unwrap } from './client';
import { LeaveRequest } from '../types';

export const leaveAPI = {
  apply: (data: { courseId: string; date: string; reason: string; proofImage: string }) =>
    api.post('/leave/apply', data).then((r) => unwrap<LeaveRequest>(r.data)),

  getAll: (courseId?: string) =>
    api.get('/leave', { params: { courseId } }).then((r) => unwrap<LeaveRequest[]>(r.data)),

  updateStatus: (id: string, status: 'approved' | 'rejected') =>
    api.patch(`/leave/${id}`, { status }).then((r) => unwrap<LeaveRequest>(r.data)),
};
