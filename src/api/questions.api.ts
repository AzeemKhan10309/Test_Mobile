import { api, unwrap } from './client';
import { Question } from '../types';

export const questionsAPI = {
  create: (testId: string, data: Partial<Question>) =>
    api.post(`/questions/test/${testId}`, data).then((r) => unwrap<Question>(r.data)),

  update: (id: string, data: Partial<Question>) =>
    api.put(`/questions/${id}`, data).then((r) => unwrap<Question>(r.data)),

  delete: (id: string) => api.delete(`/questions/${id}`).then((r) => r.data),

  bulkDelete: (questionIds: string[], testId: string) =>
    api.post('/questions/bulk-delete', { questionIds, testId }).then((r) => r.data),
};
