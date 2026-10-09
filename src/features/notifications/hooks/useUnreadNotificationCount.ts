import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useAuthStore } from '@/features/auth';
import { queryKeys } from '@/shared/api/query-keys';
import { STALE } from '@/shared/query';
import { getUnreadNotificationCount } from '../api/notifications-api';

/**
 * Supplies the header bell badge. Gated on authentication so it never fires
 * without a token; 60s staleTime, refetched on mount and on app focus.
 * `enabled: false` lets a header that was handed an explicit count skip it.
 */
export function useUnreadNotificationCount(enabled = true): UseQueryResult<number, unknown> {
  const isAuthenticated = useAuthStore((s) => s.status === 'authenticated');
  return useQuery({
    queryKey: queryKeys.bms.notificationsUnreadCount,
    queryFn: getUnreadNotificationCount,
    enabled: enabled && isAuthenticated,
    staleTime: STALE.LIST,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: false,
  });
}
