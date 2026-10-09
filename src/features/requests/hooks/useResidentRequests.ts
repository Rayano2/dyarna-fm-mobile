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
import type { Page } from '@/shared/api/page';
import type { BuildingUnit, ResidentRequest } from '../api/mappers';
import {
  approveResidentRequest,
  fetchBuildingUnits,
  fetchResidentRequests,
  type ResidentRequestsQuery,
} from '../api/requests';
import {
  approveErrorEffect,
  approveSuccessEffect,
  DECIDED_INVALIDATIONS,
  submitReject,
  type RejectResult,
} from '../lib/request-actions';

export type RequestsFilter = Omit<ResidentRequestsQuery, 'page'>;

export function useResidentRequests(
  filter: RequestsFilter,
): UseInfiniteQueryResult<InfiniteData<Page<ResidentRequest>, number>> {
  return useInfiniteQuery({
    queryKey: queryKeys.fmResidents.requestList(
      filter.status,
      filter.projectId,
      filter.buildingCode,
    ),
    queryFn: ({ pageParam }) => fetchResidentRequests({ ...filter, page: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.last ? undefined : last.page + 1),
    staleTime: STALE.LIST,
  });
}

/**
 * Units for the approve sheet. `staleTime: 0` (with a refetch on mount) so
 * the occupancy is current every time the sheet opens, as on the web.
 */
export function useBuildingUnits(buildingCode: string | undefined): UseQueryResult<BuildingUnit[]> {
  return useQuery({
    queryKey: queryKeys.fmResidents.buildingUnits(buildingCode),
    queryFn: () => fetchBuildingUnits(buildingCode ?? ''),
    enabled: !!buildingCode,
    staleTime: 0,
    refetchOnMount: 'always',
  });
}

export interface ApproveVariables {
  requestId: number;
  unitNumber: string;
}

/**
 * Cache invalidation lives here, like reject and offboard, so it runs even if
 * the sheet unmounts mid-request. The sheet only applies the UI effects
 * (toast, selection, open/closed) from `approve*Effect`.
 */
export function useApproveRequest(): UseMutationResult<void, unknown, ApproveVariables> {
  const queryClient = useQueryClient();
  const invalidate = (keys: readonly (readonly unknown[])[]): Promise<unknown> =>
    Promise.all(keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
  return useMutation({
    mutationFn: ({ requestId, unitNumber }) => approveResidentRequest(requestId, unitNumber),
    onSuccess: () => invalidate(approveSuccessEffect().invalidate),
    onError: (error) => invalidate(approveErrorEffect(error).invalidate),
  });
}

export interface RejectVariables {
  requestId: number;
  reason: string;
}

export function useRejectRequest(): UseMutationResult<RejectResult, unknown, RejectVariables> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ requestId, reason }) => submitReject(requestId, reason),
    onSuccess: async (result) => {
      if (!result.ok) return;
      await Promise.all(
        DECIDED_INVALIDATIONS.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
      );
    },
  });
}
