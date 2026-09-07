import { api, unwrap } from './client';
import { Assignment, AssignmentSubmission } from '../types';

export const assignmentsAPI = {
  create: (data: { title: string; description: string; courseId: string; deadline: string; totalMarks: number }) =>
    api.post('/assignment/create', data).then((r) => unwrap<Assignment>(r.data)),

  getByCourse: (courseId: string) => api.get(`/assignment/course/${courseId}`).then((r) => unwrap<Assignment[]>(r.data)),

  submit: (data: { assignmentId: string; fileUrl: string; text?: string }) =>
    api.post('/assignment/submit', data).then((r) => unwrap<AssignmentSubmission>(r.data)),

  getSubmissions: (assignmentId: string) =>
    api.get(`/assignment/${assignmentId}/submissions`).then((r) => unwrap<AssignmentSubmission[]>(r.data)),

  gradeSubmission: (submissionId: string, marks: number, feedback?: string) =>
    api.patch(`/assignment/submission/${submissionId}/grade`, { marks, feedback }).then((r) => unwrap<AssignmentSubmission>(r.data)),
};
