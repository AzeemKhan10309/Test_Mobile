import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { API_URL } from '../constants/config';
import { tokenStorage } from '../storage/tokenStorage';

/**
 * Single Axios instance for the whole app. Nothing outside this file should
 * ever call axios directly — every API module (auth.api.ts, tests.api.ts, ...)
 * imports `api` from here.
 *
 * Responsibilities:
 *  - Prefix requests with API_URL (…/api), so callers pass paths like '/tests'.
 *  - Attach `Authorization: Bearer <accessToken>` when we have one.
 *  - Send credentials (the refresh-token cookie rides along automatically).
 *  - On a 401 from an authenticated request, attempt exactly ONE
 *    POST /auth/refresh, queue any other requests that 401'd while that is
 *    in flight, then retry them all with the new token. If refresh fails,
 *    clear the session and let the AuthContext react (it subscribes via
 *    `onAuthFailure`).
 */

export const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 20000,
  withCredentials: true, // carries the httpOnly refresh-token cookie
  headers: { 'Content-Type': 'application/json' },
});

let isRefreshing = false;
let pendingQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

function flushQueue(error: unknown, token: string | null) {
  pendingQueue.forEach(({ resolve, reject }) => {
    if (token) resolve(token);
    else reject(error);
  });
  pendingQueue = [];
}

type AuthFailureHandler = () => void;
let authFailureHandler: AuthFailureHandler | null = null;
export function onAuthFailure(handler: AuthFailureHandler) {
  authFailureHandler = handler;
}

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await tokenStorage.getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;

    const isAuthRoute =
      originalRequest?.url?.includes('/auth/login') ||
      originalRequest?.url?.includes('/auth/refresh') ||
      originalRequest?.url?.includes('/auth/register');

    if (error.response?.status !== 401 || !originalRequest || isAuthRoute) {
      return Promise.reject(error);
    }

    if (originalRequest._retry) {
      // Already retried once after a refresh — refresh isn't fixing this.
      await tokenStorage.clearTokens();
      authFailureHandler?.();
      return Promise.reject(error);
    }

    if (isRefreshing) {
      // Another request already triggered a refresh — queue behind it
      // instead of firing a second concurrent /auth/refresh.
      return new Promise((resolve, reject) => {
        pendingQueue.push({
          resolve: (token: string) => {
            originalRequest._retry = true;
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(api(originalRequest));
          },
          reject,
        });
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const refreshResponse = await axios.post<{ success: boolean; data?: { accessToken: string } }>(
        `${API_URL}/auth/refresh`,
        {},
        { withCredentials: true }
      );
      const newToken = refreshResponse.data?.data?.accessToken;
      if (!newToken) throw new Error('Refresh did not return an access token');

      await tokenStorage.setAccessToken(newToken);
      flushQueue(null, newToken);
      originalRequest.headers.Authorization = `Bearer ${newToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      flushQueue(refreshError, null);
      await tokenStorage.clearTokens();
      authFailureHandler?.();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

/** Narrow helper so API modules can unwrap `{success, data, message}` consistently. */
export function unwrap<T>(payload: { success: boolean; data?: T; message?: string }): T {
  if (payload?.data !== undefined) return payload.data;
  return payload as unknown as T;
}
