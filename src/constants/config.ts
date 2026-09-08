import { API_BASE_URL } from '@env';

/**
 * The backend mounts everything under /api (see server.js) except /health
 * and /uploads/*. We normalize here so screens/API modules never think
 * about the prefix and we never accidentally produce /api/api.
 */
function normalizeBaseUrl(raw: string | undefined): string {
const base = raw?.trim();

  // Never silently fall back to localhost: on a physical device that makes a
  // missing/stale environment variable look like a network failure.
  if (!base) {
    throw new Error('API_BASE_URL is missing. Set it in .env and restart Expo with `npx expo start -c`.');
  }
  if (base.startsWith('API_BASE_URL=')) {
    throw new Error('API_BASE_URL must contain only the URL, not `API_BASE_URL=` twice.');
  }

  let url: URL;
  try {
    url = new URL(base);
  } catch {
    throw new Error('API_BASE_URL must be a complete http(s) URL.');
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error('API_BASE_URL must use http or https.');
  }

  // Accept either the documented backend root or a pasted URL ending in
  // /api, but expose one canonical root so API_URL can never be /api/api.
  const path = url.pathname.replace(/\/+$/, '').replace(/\/api$/, '');
  return `${url.origin}${path}`.replace(/\/+$/, '');
}

export const RAW_BASE_URL = normalizeBaseUrl(API_BASE_URL);
export const API_URL = `${RAW_BASE_URL}/api`;
export const HEALTH_URL = `${RAW_BASE_URL}/health`;
export const UPLOADS_URL = `${RAW_BASE_URL}/uploads`;
if (__DEV__) {
  // Safe diagnostic: this is a public server address, not a credential.
  console.log('API Base URL:', RAW_BASE_URL);
  console.log('API URL:', API_URL);
}
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
