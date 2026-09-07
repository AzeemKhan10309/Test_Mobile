import { api, unwrap } from './client';
import { Subscription } from '../types';

export const subscriptionsAPI = {
  getPlans: () => api.get('/subscriptions/plans').then((r) => unwrap(r.data)),
  getStatus: () => api.get('/subscriptions/status').then((r) => unwrap<Subscription>(r.data)),
  // The backend may return a real checkout URL OR a configuration message
  // instead of a completed payment — the caller MUST branch on which one
  // it got rather than assume success.
  checkout: (plan: string) =>
    api.post('/subscriptions/checkout', { plan }).then((r) => unwrap<{ checkoutUrl?: string; message?: string }>(r.data)),
};
