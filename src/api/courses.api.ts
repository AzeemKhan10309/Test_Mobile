import { api, unwrap } from './client';
import { Course } from '../types';

// Backend exposes both /courses and /course as aliases — we standardize on
// /courses for reads/writes and /course/:id for the singular update path,
// matching what the contract audit shows in actual use.
export const coursesAPI = {
  getAll: () => api.get('/courses').then((r) => unwrap<Course[]>(r.data)),

  create: (data: { courseName: string; courseCode?: string; description: string; classType: string }) =>
    api.post('/courses', data).then((r) => unwrap<Course>(r.data)),

  update: (id: string, data: Partial<Pick<Course, 'courseName' | 'description' | 'classType'>>) =>
    api.put(`/course/${id}`, data).then((r) => unwrap<Course>(r.data)),

  delete: (id: string) => api.delete(`/course/${id}`).then((r) => r.data),

  getStudents: (courseId: string, params?: { gender?: string }) =>
    api.get(`/courses/${courseId}/students`, { params }).then((r) => unwrap(r.data)),

  joinByCode: (courseCode: string, studentId?: string) =>
    api.post('/join-course', { courseCode, studentId }).then((r) => unwrap(r.data)),

  enroll: (courseCode: string, studentId?: string) =>
    api.post('/course/enroll', { courseCode, studentId }).then((r) => unwrap(r.data)),
};
