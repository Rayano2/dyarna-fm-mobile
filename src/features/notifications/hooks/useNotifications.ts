import { useMemo } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/features/auth';
import { queryKeys } from '@/shared/api/query-keys';
import { STALE } from '@/shared/query';
import type { AppNotification } from '@/types/notification';
import { listNotifications } from '../api/notifications-api';

export interface UseNotificationsResult {
  notifications: AppNotification[];
  isLoading: boolean;
  isRefetching: boolean;
  hasNextPage: boolean;
  fetchNextPage: () => void;
  isFetchingNextPage: boolean;
  refetch: () => void;
  error: unknown;
  errorUpdatedAt: number;
}

/**
 * The inbox list, 20 per page. Server order (createdAt DESC) is kept verbatim:
 * an inbox that reorders itself as you read loses the user's place.
 */
export function useNotifications(): UseNotificationsResult {
  const isAuthenticated = useAuthStore((s) => s.status === 'authenticated');
  const query = useInfiniteQuery({
    queryKey: queryKeys.bms.notificationsList,
    queryFn: ({ pageParam }) => listNotifications(pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.page + 1 : undefined),
    enabled: isAuthenticated,
    staleTime: STALE.LIST,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const notifications = useMemo(
    () => query.data?.pages.flatMap((page) => page.notifications) ?? [],
    [query.data?.pages],
  );

  return {
    notifications,
    isLoading: query.isLoading,
    isRefetching: query.isRefetching,
    hasNextPage: query.hasNextPage,
    fetchNextPage: () => void query.fetchNextPage(),
    isFetchingNextPage: query.isFetchingNextPage,
    refetch: () => void query.refetch(),
    error: query.error,
    errorUpdatedAt: query.errorUpdatedAt,
  };
}
