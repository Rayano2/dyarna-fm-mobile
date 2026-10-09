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
import { DECIDED_INVALIDATIONS, submitReject, type RejectResult } from '../lib/request-actions';

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

/** Effects (toast, invalidation, sheet state) are applied by the sheet via `approve*Effect`. */
export function useApproveRequest(): UseMutationResult<void, unknown, ApproveVariables> {
  return useMutation({
    mutationFn: ({ requestId, unitNumber }) => approveResidentRequest(requestId, unitNumber),
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
