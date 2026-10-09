import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
  type UseInfiniteQueryResult,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import { queryKeys } from '@/shared/api/query-keys';
import { STALE } from '@/shared/query';
import {
  listAllBookings,
  listBookings,
  updateBookingStatus,
  type Booking,
  type BookingPage,
  type BookingQuery,
} from '../api/bookings-api';

const PREFIX = queryKeys.community.fmFacilityBookings;

export function useBookingsAgenda(
  query: BookingQuery | undefined,
): UseInfiniteQueryResult<InfiniteData<BookingPage, number>> {
  return useInfiniteQuery({
    queryKey: [...PREFIX, 'list', query ?? null],
    queryFn: ({ pageParam }) => listBookings(query!, pageParam),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.last ? undefined : last.page + 1),
    enabled: !!query,
    staleTime: STALE.DETAIL,
  });
}

export function useBookingsWeek(query: BookingQuery | undefined): UseQueryResult<Booking[]> {
  return useQuery({
    queryKey: [...PREFIX, 'week', query ?? null],
    queryFn: () => listAllBookings(query!),
    enabled: !!query,
    staleTime: STALE.DETAIL,
  });
}

export interface DecideInput {
  id: string;
  status: 'APPROVED' | 'REJECTED';
  reason?: string;
}

/**
 * Approve / reject. Pessimistic: nothing changes on screen until the server
 * answers, then every bookings cache refetches. An infinite list refetches
 * from page 0, so a page the decision emptied cannot strand the user.
 */
export function useDecideBooking(): UseMutationResult<void, Error, DecideInput> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, reason }) => updateBookingStatus(id, status, reason),
    onSettled: () => qc.invalidateQueries({ queryKey: PREFIX }),
  });
}
