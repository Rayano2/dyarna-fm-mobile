import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/shared/api/query-keys';
import { STALE } from '@/shared/query';
import { getTicket, isTicketNotFoundError } from '../api/get-ticket';

/** Not-found is a definitive answer: never retry it. Other failures retry twice. */
export function shouldRetryTicket(failureCount: number, error: unknown): boolean {
  return !isTicketNotFoundError(error) && failureCount < 2;
}

export function useTicket(ticketNumber: string | undefined) {
  const query = useQuery({
    queryKey: queryKeys.tms.ticketDetail(ticketNumber),
    queryFn: () => getTicket(ticketNumber!),
    enabled: !!ticketNumber,
    staleTime: STALE.DETAIL,
    retry: shouldRetryTicket,
  });
  return { ...query, isNotFound: isTicketNotFoundError(query.error) };
}
