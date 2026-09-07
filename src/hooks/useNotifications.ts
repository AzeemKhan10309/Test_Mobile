import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notificationsAPI } from '../api/notifications.api';
import { QUERY_KEYS } from '../constants/config';

export function useNotifications() {
  return useQuery({
    queryKey: QUERY_KEYS.notifications,
    queryFn: notificationsAPI.getAll,
    refetchInterval: 60_000, // gentle polling — no backend WebSocket support
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: notificationsAPI.markAllRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.notifications }),
  });
}
