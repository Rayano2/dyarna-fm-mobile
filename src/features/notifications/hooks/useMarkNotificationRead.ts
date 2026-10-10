import {
  useMutation,
  useQueryClient,
  type MutationOptions,
  type QueryClient,
  type UseMutationResult,
} from '@tanstack/react-query';
import { queryKeys } from '@/shared/api/query-keys';
import { markNotificationRead } from '../api/notifications-api';
import {
  decrementUnreadCount,
  markReadInPages,
  type NotificationPagesData,
} from '../lib/unread-count';

export interface MarkReadContext {
  previousPages: NotificationPagesData | undefined;
  previousCount: number | undefined;
}

/**
 * Optimistic: the unread dot, bold title and tint drop the instant the user
 * taps, and the bell count with them. Failure rolls both back; the caller
 * raises the toast. Re-tapping an already-read row changes nothing and never
 * walks the badge down.
 */
export function markReadMutationOptions(
  queryClient: QueryClient,
): MutationOptions<void, unknown, string, MarkReadContext> {
  const listKey = queryKeys.bms.notificationsList;
  const countKey = queryKeys.bms.notificationsUnreadCount;
  return {
    mutationFn: (id) => markNotificationRead(id),
    onMutate: async (id) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: listKey }),
        queryClient.cancelQueries({ queryKey: countKey }),
      ]);
      const previousPages = queryClient.getQueryData<NotificationPagesData>(listKey);
      const nextPages = markReadInPages(previousPages, id);
      // Same reference: already read (or not loaded). Nothing to flip or decrement.
      if (nextPages === previousPages) {
        return { previousPages: undefined, previousCount: undefined };
      }
      queryClient.setQueryData(listKey, nextPages);
      const previousCount = queryClient.getQueryData<number>(countKey);
      queryClient.setQueryData(countKey, decrementUnreadCount(previousCount));
      return { previousPages, previousCount };
    },
    onError: (_error, _id, context) => {
      if (context?.previousPages !== undefined) {
        queryClient.setQueryData(listKey, context.previousPages);
      }
      if (context?.previousCount !== undefined) {
        queryClient.setQueryData(countKey, context.previousCount);
      }
    },
    onSettled: () => {
      // Count and list: the server is the tiebreaker for both.
      void queryClient.invalidateQueries({ queryKey: queryKeys.bms.notifications });
    },
  };
}

export function useMarkNotificationRead(): UseMutationResult<
  void,
  unknown,
  string,
  MarkReadContext
> {
  const queryClient = useQueryClient();
  return useMutation(markReadMutationOptions(queryClient));
}
