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
import type { Page } from '@/shared/api/page';
import { queryKeys } from '@/shared/api/query-keys';
import { STALE } from '@/shared/query';
import type { OffboardResult, Resident, ResidentDetails } from '../api/mappers';
import {
  fetchResidentDetails,
  fetchResidents,
  offboardResident,
  type OffboardInput,
  type ResidentsQuery,
} from '../api/residents';
import { OFFBOARD_INVALIDATIONS } from '../lib/residents-logic';

export function useResidents(
  filter: Omit<ResidentsQuery, 'page'>,
): UseInfiniteQueryResult<InfiniteData<Page<Resident>, number>> {
  return useInfiniteQuery({
    queryKey: queryKeys.fmResidents.residentList(filter.projectId, filter.buildingCode),
    queryFn: ({ pageParam }) => fetchResidents({ ...filter, page: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.last ? undefined : last.page + 1),
    staleTime: STALE.LIST,
  });
}

export function useResidentDetails(userId: string | undefined): UseQueryResult<ResidentDetails> {
  return useQuery({
    queryKey: queryKeys.fmResidents.residentDetail(userId),
    queryFn: () => fetchResidentDetails(userId ?? ''),
    enabled: !!userId,
    staleTime: STALE.DETAIL,
  });
}

/** Errors are shown inline by the sheet (`classifyOffboardError`), not toasted here. */
export function useOffboardResident(): UseMutationResult<OffboardResult, unknown, OffboardInput> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: offboardResident,
    onSuccess: async () => {
      await Promise.all(
        OFFBOARD_INVALIDATIONS.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
      );
    },
  });
}
