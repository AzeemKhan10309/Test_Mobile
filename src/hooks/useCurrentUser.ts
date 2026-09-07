import { useQuery } from '@tanstack/react-query';
import { authAPI } from '../api/auth.api';
import { QUERY_KEYS } from '../constants/config';
import { useAuth } from '../contexts/AuthContext';

/** Re-fetches the authoritative user record; prefer this over trusting stale context state in screens that need fresh role/profile data. */
export function useCurrentUser() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: QUERY_KEYS.me,
    queryFn: authAPI.me,
    enabled: isAuthenticated,
    staleTime: 60_000,
  });
}
