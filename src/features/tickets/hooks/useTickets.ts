import { useMemo } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { queryKeys } from '@/shared/api/query-keys';
import { STALE } from '@/shared/query';
import { listTickets } from '../api/list-tickets';
import type { FmTicket, TicketListFilters, TicketsPage } from '../types';

export function nextPageParam(last: TicketsPage): number | undefined {
  const next = last.page + 1;
  return next < last.totalPages ? next : undefined;
}

/** Infinite FM ticket list (15 per page) for the current filters. */
export function useTickets(filters: TicketListFilters) {
  const query = useInfiniteQuery({
    queryKey: queryKeys.tms.fmTicketList(filters),
    queryFn: ({ pageParam }) => listTickets(filters, pageParam),
    initialPageParam: 0,
    getNextPageParam: nextPageParam,
    staleTime: STALE.LIST,
  });

  const tickets = useMemo<FmTicket[]>(() => {
    const seen = new Set<string>();
    const out: FmTicket[] = [];
    // A ticket can shift pages between fetches; keep the first copy only.
    for (const page of query.data?.pages ?? []) {
      for (const ticket of page.content) {
        if (seen.has(ticket.tktNumber)) continue;
        seen.add(ticket.tktNumber);
        out.push(ticket);
      }
    }
    return out;
  }, [query.data]);

  return { ...query, tickets };
}
