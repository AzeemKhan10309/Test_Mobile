import { api, unwrap } from './client';
import { PaginatedResponse, Question, Test } from '../types';

export const testsAPI = {
  getAll: (params?: { status?: string; page?: number; limit?: number }) =>
    api.get('/tests', { params }).then((r) => unwrap<PaginatedResponse<Test>>(r.data)),

  getById: (id: string) => api.get(`/tests/${id}`).then((r) => unwrap<Test>(r.data)),

  create: (data: Record<string, unknown>) =>
    api.post('/tests', data).then((r) => unwrap<Test>(r.data)),

  update: (id: string, data: Record<string, unknown>) =>
    api.put(`/tests/${id}`, data).then((r) => unwrap<Test>(r.data)),

  delete: (id: string) => api.delete(`/tests/${id}`).then((r) => r.data),

  publish: (id: string) => api.post(`/tests/${id}/publish`).then((r) => unwrap<Test>(r.data)),

  end: (id: string) => api.post(`/tests/${id}/end`).then((r) => unwrap<Test>(r.data)),

  joinByShareLink: (shareLink: string) =>
    api.get(`/tests/join/${shareLink}`).then((r) => unwrap<Test>(r.data)),

  getQuestions: (id: string) =>
        api.get(`/tests/${id}/questions`).then((r) => unwrap<Question[]>(r.data)),

  getStudents: (id: string) =>
    api.get(`/tests/${id}/students`).then((r) => unwrap(r.data)),
};
