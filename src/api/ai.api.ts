import { api, unwrap } from './client';

// The backend does NOT mount /ai/generate-questions (see API audit's
// "Intentional exclusions") — do not add it here even if older docs
// reference it. Only grade-answer is a real, supported route, and it's
// teacher-only per backend authorization.
export const aiAPI = {
  gradeAnswer: (data: { question: string; correctAnswer: string; studentAnswer: string; maxMarks: number }) =>
    api.post('/ai/grade-answer', data).then((r) => unwrap<{ marksAwarded: number; feedback?: string }>(r.data)),
};
