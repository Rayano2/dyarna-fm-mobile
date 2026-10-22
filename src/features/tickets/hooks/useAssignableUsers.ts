import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/shared/api/query-keys';
import { getAssignableUsers } from '../api/get-assignable-users';

/**
 * Eligible assignees for a ticket. Only the picker uses it, fetching while
 * open. One retry: old bms-tms builds have no endpoint, and the picker should
 * reach its error state fast rather than spin through three retries.
 */
export function useAssignableUsers(ticketNumber: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.tms.ticketAssignable(ticketNumber),
    queryFn: () => getAssignableUsers(ticketNumber),
    enabled: enabled && !!ticketNumber,
    retry: 1,
  });
}
