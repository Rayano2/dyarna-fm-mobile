import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/shared/api/query-keys';
import { getAssignableUsers } from '../api/get-assignable-users';

/** Eligible assignees for a ticket. `enabled` lets the picker fetch only while open. */
export function useAssignableUsers(ticketNumber: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.tms.ticketAssignable(ticketNumber),
    queryFn: () => getAssignableUsers(ticketNumber),
    enabled: enabled && !!ticketNumber,
  });
}
