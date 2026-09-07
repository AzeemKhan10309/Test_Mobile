import { api, unwrap } from './client';
import { Course, SubmissionResult, Test } from '../types';

export const teacherAPI = {
  getCourses: () => api.get('/teacher/courses').then((r) => unwrap<Course[]>(r.data)),
  getTests: (courseId?: string) => api.get('/teacher/tests', { params: { courseId } }).then((r) => unwrap<Test[]>(r.data)),
  getSubmissions: (courseId?: string) => api.get('/teacher/submissions', { params: { courseId } }).then((r) => unwrap(r.data)),
  getSubmissionForEvaluation: (id: string) => api.get(`/teacher/submission/${id}`).then((r) => unwrap<SubmissionResult>(r.data)),
  evaluate: (id: string, grades: unknown[], teacherNotes?: string, finalSubmit?: boolean) =>
    api.patch(`/teacher/submission/${id}/evaluate`, { grades, teacherNotes, finalSubmit }).then((r) => unwrap(r.data)),
};
