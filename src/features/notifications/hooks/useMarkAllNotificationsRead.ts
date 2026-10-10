import {
  useMutation,
  useQueryClient,
  type MutationOptions,
  type QueryClient,
  type UseMutationResult,
} from '@tanstack/react-query';
import { queryKeys } from '@/shared/api/query-keys';
import { markAllNotificationsRead } from '../api/notifications-api';
import { markAllReadInPages, type NotificationPagesData } from '../lib/unread-count';

export interface MarkAllReadContext {
  previousPages: NotificationPagesData | undefined;
  previousCount: number | undefined;
}

/**
 * Optimistic read-all: every loaded row flips and the count goes to 0 (read-all
 * is absolute). On failure both caches roll back; the caller raises the toast.
 * Exported so the rollback is testable without rendering.
 */
export function markAllReadMutationOptions(
  queryClient: QueryClient,
): MutationOptions<void, unknown, void, MarkAllReadContext> {
  const listKey = queryKeys.bms.notificationsList;
  const countKey = queryKeys.bms.notificationsUnreadCount;
  return {
    mutationFn: () => markAllNotificationsRead(),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: queryKeys.bms.notifications });
      const previousPages = queryClient.getQueryData<NotificationPagesData>(listKey);
      const previousCount = queryClient.getQueryData<number>(countKey);
      queryClient.setQueryData(listKey, markAllReadInPages(previousPages));
      queryClient.setQueryData(countKey, 0);
      return { previousPages, previousCount };
    },
    onError: (_error, _vars, context) => {
      if (context?.previousPages !== undefined) {
        queryClient.setQueryData(listKey, context.previousPages);
      }
      if (context?.previousCount !== undefined) {
        queryClient.setQueryData(countKey, context.previousCount);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.bms.notifications });
    },
  };
}

export function useMarkAllNotificationsRead(): UseMutationResult<
  void,
  unknown,
  void,
  MarkAllReadContext
> {
  const queryClient = useQueryClient();
  return useMutation(markAllReadMutationOptions(queryClient));
}
