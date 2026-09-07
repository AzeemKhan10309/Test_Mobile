import { api, unwrap } from './client';
import { Course, PaginatedResponse, Result, User } from '../types';

export const adminAPI = {
  getStats: () => api.get('/admin/stats').then((r) => unwrap(r.data)),

  getTeachers: () => api.get('/admin/teachers').then((r) => unwrap<User[]>(r.data)),
  createTeacher: (data: { name: string; email: string; password: string }) =>
    api.post('/admin/teachers', data).then((r) => unwrap<User>(r.data)),
  updateTeacher: (id: string, data: Partial<User>) => api.put(`/admin/teachers/${id}`, data).then((r) => unwrap<User>(r.data)),
  deleteTeacher: (id: string) => api.delete(`/admin/teachers/${id}`).then((r) => r.data),
  getTeacherProfile: (id: string) => api.get(`/admin/teachers/${id}/profile`).then((r) => unwrap(r.data)),

  getCourses: (teacherId?: string) => api.get('/admin/courses', { params: { teacherId } }).then((r) => unwrap<Course[]>(r.data)),
  reassignCourseTeacher: (id: string, teacherId: string | null) =>
    api.put(`/admin/courses/${id}/teacher`, { teacherId }).then((r) => unwrap<Course>(r.data)),
  deleteCourse: (id: string) => api.delete(`/admin/courses/${id}`).then((r) => r.data),

  getStudents: () => api.get('/admin/students').then((r) => unwrap<User[]>(r.data)),
  updateStudent: (id: string, data: Partial<User>) => api.put(`/admin/students/${id}`, data).then((r) => unwrap<User>(r.data)),
  bulkAddStudentsFile: (fileUri: string, filename: string, mimeType: string) => {
    const form = new FormData();
    form.append('file', { uri: fileUri, name: filename, type: mimeType } as unknown as Blob);
    return api.post('/admin/students/bulk-add', form, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => unwrap(r.data));
  },
  bulkDeleteStudents: (studentIds: string[]) =>
    api.post('/admin/students/bulk-delete', { studentIds }).then((r) => unwrap(r.data)),

  manualEnroll: (studentId: string, courseId: string) =>
    api.post('/admin/enrollments/manual', { studentId, courseId }).then((r) => unwrap(r.data)),
  bulkEnroll: (courseId: string, studentIds: string[]) =>
    api.post('/admin/enrollments/bulk', { courseId, studentIds }).then((r) => unwrap(r.data)),

  getResults: (params?: { studentId?: string; courseId?: string; testType?: string }) =>
    api.get('/admin/results', { params }).then((r) => unwrap<Result[]>(r.data)),
  updateResult: (id: string, data: Partial<Result>) => api.put(`/admin/results/${id}`, data).then((r) => unwrap<Result>(r.data)),
  deleteResult: (id: string) => api.delete(`/admin/results/${id}`).then((r) => r.data),

  createAnnouncement: (data: { title: string; message: string; targetType: string; courseId?: string; teacherId?: string }) =>
    api.post('/admin/announcements', data).then((r) => unwrap(r.data)),

  getUsers: (params?: { role?: string; page?: number; limit?: number }) =>
    api.get('/admin/users', { params }).then((r) => unwrap<PaginatedResponse<User>>(r.data)),
  createUser: (data: Record<string, unknown>) => api.post('/admin/users', data).then((r) => unwrap<User>(r.data)),
  toggleUserActive: (id: string) => api.put(`/admin/users/${id}/toggle-active`).then((r) => unwrap<User>(r.data)),
  deleteUser: (id: string) => api.delete(`/admin/users/${id}`).then((r) => r.data),

  getAllTeachersForFilters: () => api.get('/teachers').then((r) => unwrap<User[]>(r.data)),
  getTeacherCourses: (teacherId: string) => api.get(`/teachers/${teacherId}/courses`).then((r) => unwrap<Course[]>(r.data)),
  getCourseReviews: (courseId: string, params?: Record<string, unknown>) =>
    api.get(`/courses/${courseId}/reviews`, { params }).then((r) => unwrap(r.data)),
};
