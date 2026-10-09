import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/shared/api/query-keys';
import { STALE } from '@/shared/query';
import { listTicketComments } from '../api/comments';

/** Read-only comment thread, by NUMERIC ticket id (from the loaded detail). */
export function useTicketComments(ticketId: number | undefined) {
  return useQuery({
    queryKey: queryKeys.tms.ticketComments(ticketId),
    queryFn: () => listTicketComments(ticketId!),
    enabled: ticketId !== undefined,
    staleTime: STALE.DETAIL,
  });
}
