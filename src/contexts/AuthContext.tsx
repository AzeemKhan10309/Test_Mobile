import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { authAPI } from '../api/auth.api';
import { onAuthFailure } from '../api/client';
import { tokenStorage } from '../storage/tokenStorage';
import { User } from '../types';

interface AuthContextValue {
  user: User | null;
  isLoading: boolean; // still resolving session on app start
  isAuthenticated: boolean;
  login: (data: { email?: string; studentId?: string; password: string }) => Promise<User>;
  registerStudent: (data: Parameters<typeof authAPI.registerStudent>[0]) => Promise<User>;
  registerTeacher: (data: Parameters<typeof authAPI.registerTeacher>[0]) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const bootstrapped = useRef(false);

  async function refreshUser() {
    const me = await authAPI.me();
    setUser(me);
    await tokenStorage.setCachedUserShell({ role: me.role, name: me.name });
  }

  async function hardLogoutLocal() {
    setUser(null);
    await tokenStorage.clearTokens();
  }

  useEffect(() => {
    // Register once: if the Axios interceptor exhausts refresh attempts,
    // it calls this so the whole app falls back to the Login screen instead
    // of hanging on stale, unauthenticated state.
    onAuthFailure(() => {
      setUser(null);
    });
  }, []);

  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;

    (async () => {
      const token = await tokenStorage.getAccessToken();
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        await refreshUser();
      } catch {
        await hardLogoutLocal();
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  async function login(data: { email?: string; studentId?: string; password: string }) {
    const res = await authAPI.login(data);
    await tokenStorage.setAccessToken(res.accessToken);
    setUser(res.user);
    await tokenStorage.setCachedUserShell({ role: res.user.role, name: res.user.name });
    return res.user;
  }

  async function registerStudent(data: Parameters<typeof authAPI.registerStudent>[0]) {
    const res = await authAPI.registerStudent(data);
    await tokenStorage.setAccessToken(res.accessToken);
    setUser(res.user);
    return res.user;
  }

  async function registerTeacher(data: Parameters<typeof authAPI.registerTeacher>[0]) {
    const res = await authAPI.registerTeacher(data);
    await tokenStorage.setAccessToken(res.accessToken);
    setUser(res.user);
    return res.user;
  }

  async function logout() {
    try {
      await authAPI.logout();
    } catch {
      // Even if the network call fails, still clear local session.
    }
    await hardLogoutLocal();
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        registerStudent,
        registerTeacher,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
