import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Access tokens live in SecureStore (Keychain/Keystore backed).
 * The refresh token itself is NEVER stored here — the backend sets it as an
 * httpOnly cookie and Axios sends it via `withCredentials`. We only persist
 * the short-lived access token and a minimal cached user shell for fast
 * splash-screen decisions before /auth/me resolves.
 */
const ACCESS_TOKEN_KEY = 'auth.accessToken';
const CACHED_USER_KEY = 'auth.cachedUser';

export const tokenStorage = {
  async getAccessToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    } catch {
      return null;
    }
  },

  async setAccessToken(token: string): Promise<void> {
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);
  },

  async clearTokens(): Promise<void> {
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    await AsyncStorage.removeItem(CACHED_USER_KEY);
  },

  // Non-sensitive: only used to render a role-aware splash/skeleton before
  // /auth/me confirms the real session. Never trusted for authorization.
  async getCachedUserShell(): Promise<{ role: string; name: string } | null> {
    try {
      const raw = await AsyncStorage.getItem(CACHED_USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  async setCachedUserShell(shell: { role: string; name: string }): Promise<void> {
    await AsyncStorage.setItem(CACHED_USER_KEY, JSON.stringify(shell));
  },
};
