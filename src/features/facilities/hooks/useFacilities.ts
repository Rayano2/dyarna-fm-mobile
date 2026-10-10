import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import { queryKeys } from '@/shared/api/query-keys';
import { STALE } from '@/shared/query';
import {
  createFacility,
  listFacilities,
  setFacilityActive,
  updateFacility,
  type Facility,
  type FacilityActiveResult,
  type FacilityPayload,
} from '../api/facilities-api';

/** Prefix for every FM facility list (all projects/buildings). */
const MANAGE_PREFIX = ['community', 'facilities', 'manage'] as const;

export function useFacilities(
  projectId: string | undefined,
  buildingId: string | undefined,
): UseQueryResult<Facility[]> {
  return useQuery({
    queryKey: queryKeys.community.fmFacilities(projectId, buildingId),
    queryFn: () => listFacilities(projectId!, buildingId),
    enabled: !!projectId,
    staleTime: STALE.LIST,
  });
}

export interface SaveFacilityInput {
  id: string | undefined;
  payload: FacilityPayload;
}

export function useSaveFacility(): UseMutationResult<void, Error, SaveFacilityInput> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => (id ? updateFacility(id, payload) : createFacility(payload)),
    onSuccess: () => qc.invalidateQueries({ queryKey: MANAGE_PREFIX }),
  });
}

export interface SetActiveInput {
  id: string;
  active: boolean;
}

export function useSetFacilityActive(): UseMutationResult<
  FacilityActiveResult,
  Error,
  SetActiveInput
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, active }) => setFacilityActive(id, active),
    onSettled: () => qc.invalidateQueries({ queryKey: MANAGE_PREFIX }),
  });
}
