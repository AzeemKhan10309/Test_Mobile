import { api, unwrap } from './client';

export const analyticsAPI = {
  dashboard: () => api.get('/analytics/dashboard').then((r) => unwrap(r.data)),
  test: (testId: string) => api.get(`/analytics/test/${testId}`).then((r) => unwrap(r.data)),
  student: (studentId: string) => api.get(`/analytics/student/${studentId}`).then((r) => unwrap(r.data)),
};
