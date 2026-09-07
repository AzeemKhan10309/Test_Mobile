import { api, unwrap } from './client';
import { PaginatedResponse, RetakeRequest } from '../types';

export const retakeAPI = {
  request: (testId: string, reason: string) =>
    api.post('/retake/request', { testId, reason }).then((r) => unwrap<RetakeRequest>(r.data)),

  getForTest: (testId: string, params?: { status?: string; page?: number; limit?: number }) =>
    api.get(`/retake/test/${testId}/requests`, { params }).then((r) => unwrap<PaginatedResponse<RetakeRequest>>(r.data)),

  approve: (requestId: string, message?: string) =>
    api.post(`/retake/${requestId}/approve`, { message }).then((r) => unwrap<RetakeRequest>(r.data)),

  reject: (requestId: string, message?: string) =>
    api.post(`/retake/${requestId}/reject`, { message }).then((r) => unwrap<RetakeRequest>(r.data)),
};
