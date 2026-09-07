import { API_BASE_URL } from '@env';

/**
 * The backend mounts everything under /api (see server.js) except /health
 * and /uploads/*. We normalize here so screens/API modules never think
 * about the prefix and we never accidentally produce /api/api.
 */
function normalizeBaseUrl(raw: string | undefined): string {
  const fallback = 'http://localhost:5000';
  const base = (raw || fallback).replace(/\/+$/, ''); // strip trailing slashes
  return base;
}

export const RAW_BASE_URL = normalizeBaseUrl(API_BASE_URL);
export const API_URL = `${RAW_BASE_URL}/api`;
export const HEALTH_URL = `${RAW_BASE_URL}/health`;
export const UPLOADS_URL = `${RAW_BASE_URL}/uploads`;

export const QUERY_KEYS = {
  me: ['auth', 'me'] as const,
  tests: (params?: unknown) => ['tests', params] as const,
  test: (id: string) => ['tests', id] as const,
  questions: (testId: string) => ['questions', testId] as const,
  submission: (id: string) => ['submissions', id] as const,
  submissionStatus: (testId: string) => ['submissions', 'status', testId] as const,
  timer: (submissionId: string) => ['submissions', submissionId, 'timer'] as const,
  courses: ['courses'] as const,
  attendance: (courseId: string, date?: string) => ['attendance', courseId, date] as const,
  marks: (courseId: string) => ['marks', courseId] as const,
  notifications: ['notifications'] as const,
  analyticsDashboard: ['analytics', 'dashboard'] as const,
  analyticsStudent: (studentId: string) => ['analytics', 'student', studentId] as const,
  analyticsTest: (testId: string) => ['analytics', 'test', testId] as const,
  results: (studentId: string) => ['results', studentId] as const,
  reviewsMy: ['reviews', 'my'] as const,
  adminStats: ['admin', 'stats'] as const,
  adminUsers: (params?: unknown) => ['admin', 'users', params] as const,
  subscriptionPlans: ['subscriptions', 'plans'] as const,
  subscriptionStatus: ['subscriptions', 'status'] as const,
  chatPartners: ['chat', 'partners'] as const,
  chatMessages: (userId: string) => ['chat', 'messages', userId] as const,
  myGroups: ['groups', 'my'] as const,
  groupMessages: (groupId: string) => ['groups', groupId, 'messages'] as const,
  leave: (courseId?: string) => ['leave', courseId] as const,
  assignments: (courseId: string) => ['assignments', courseId] as const,
  announcements: (courseId: string) => ['announcements', courseId] as const,
};
