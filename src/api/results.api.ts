import { api, unwrap } from './client';
import { Result } from '../types';

export const resultsAPI = {
  getForStudent: (studentIdOrMe: string) =>
    api.get(`/results/student/${studentIdOrMe}`).then((r) => unwrap<{ results: Result[]; overall?: unknown }>(r.data)),

  create: (data: { studentId: string; title: string; type: string; marksObtained: number; totalMarks: number; date: string }) =>
    api.post('/results', data).then((r) => unwrap<Result>(r.data)),

  update: (id: string, data: Partial<Result>) => api.put(`/results/${id}`, data).then((r) => unwrap<Result>(r.data)),

  delete: (id: string) => api.delete(`/results/${id}`).then((r) => r.data),
};
