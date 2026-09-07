import { api, unwrap } from './client';
import { Answer, Submission, SubmissionResult } from '../types';

export const submissionsAPI = {
  start: (data: { testId: string; [k: string]: unknown }) =>
    api.post('/submissions/start', data).then((r) => unwrap<Submission>(r.data)),

  getStatusForTest: (testId: string) =>
    api.get(`/submissions/status/test/${testId}`).then((r) => unwrap<Submission | null>(r.data)),

  getForTest: (testId: string) =>
    api.get(`/submissions/test/${testId}`).then((r) => unwrap<Submission[]>(r.data)),

  getById: (submissionId: string) =>
    api.get(`/submissions/${submissionId}`).then((r) => unwrap<Submission>(r.data)),

  getTimer: (submissionId: string) =>
    api.get(`/submissions/${submissionId}/timer`).then((r) => unwrap<{ remainingSeconds: number; serverTime: string }>(r.data)),

  saveAnswers: (submissionId: string, answers: Answer[]) =>
    api.put(`/submissions/${submissionId}/answers`, { answers }).then((r) => unwrap<Submission>(r.data)),

  flag: (submissionId: string, type: string, details?: string) =>
    api.post(`/submissions/${submissionId}/flag`, { type, details }).then((r) => r.data),

  heartbeat: (submissionId: string, heartbeatToken?: string) =>
    api.post(`/submissions/${submissionId}/heartbeat`, { heartbeatToken }).then((r) => unwrap<{ remainingSeconds: number }>(r.data)),

  submit: (submissionId: string, idempotencyKey?: string) =>
    api
      .post(
        `/submissions/${submissionId}/submit`,
        {},
        idempotencyKey ? { headers: { 'Idempotency-Key': idempotencyKey } } : undefined
      )
      .then((r) => unwrap<Submission>(r.data)),

  forceSubmit: (submissionId: string) =>
    api.post(`/submissions/${submissionId}/force-submit`).then((r) => unwrap<Submission>(r.data)),

  getResult: (submissionId: string) =>
    api.get(`/submissions/${submissionId}/result`).then((r) => unwrap<SubmissionResult>(r.data)),

  grade: (submissionId: string, grades: unknown, teacherNotes?: string) =>
    api.patch(`/submissions/${submissionId}/grade`, { grades, teacherNotes }).then((r) => unwrap<Submission>(r.data)),

  gradeOverride: (submissionId: string, data: Record<string, unknown>) =>
    api.put(`/submissions/${submissionId}/grade-override`, data).then((r) => unwrap<Submission>(r.data)),
};
