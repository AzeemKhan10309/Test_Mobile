import { api, unwrap } from './client';
import { Mark } from '../types';

export type ReportFormat = 'json' | 'pdf' | 'excel';

export const marksAPI = {
  create: (data: Omit<Mark, '_id'>) => api.post('/marks', data).then((r) => unwrap<Mark>(r.data)),

  getByCourse: (courseId: string) => api.get(`/marks/${courseId}`).then((r) => unwrap<Mark[]>(r.data)),

  studentReport: (studentId: string, courseId: string, format: ReportFormat = 'json') =>
    api.get(`/marks/report/student/${studentId}/${courseId}`, {
      params: { format },
      responseType: format === 'json' ? 'json' : 'arraybuffer',
    }),

  myReport: (courseId: string, format: ReportFormat = 'json') =>
    api.get(`/marks/report/my/${courseId}`, {
      params: { format },
      responseType: format === 'json' ? 'json' : 'arraybuffer',
    }),

  classReport: (courseId: string, format: ReportFormat = 'json') =>
    api.get(`/marks/report/class/${courseId}`, {
      params: { format },
      responseType: format === 'json' ? 'json' : 'arraybuffer',
    }),
};
