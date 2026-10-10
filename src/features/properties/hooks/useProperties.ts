import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import { queryKeys } from '@/shared/api/query-keys';
import { STALE } from '@/shared/query';
import type { ProjectUser, PropertyProject } from '../api/mappers';
import {
  assignPresident,
  createUnit,
  fetchProjectUsers,
  fetchPropertiesList,
  type AssignPresidentInput,
  type CreateUnitInput,
} from '../api/properties';

export function usePropertiesList(): UseQueryResult<PropertyProject[]> {
  return useQuery({
    queryKey: queryKeys.bms.propertiesList,
    queryFn: fetchPropertiesList,
    staleTime: STALE.LIST,
  });
}

/** Users who can be made president. Only fetched while the sheet is open. */
export function useProjectUsers(
  projectId: number | undefined,
  enabled: boolean,
): UseQueryResult<ProjectUser[]> {
  return useQuery({
    queryKey: queryKeys.bms.projectUsers(projectId),
    queryFn: () => fetchProjectUsers(projectId ?? 0),
    enabled: enabled && projectId !== undefined,
    staleTime: STALE.LIST,
  });
}

/** Errors are toasted by the sheet, which stays open with the user's input. */
export function useCreateUnit(): UseMutationResult<void, unknown, CreateUnitInput> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createUnit,
    onSuccess: async (_data, input) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.bms.propertiesList }),
        // The resident-request approve sheet caches this building's units.
        queryClient.invalidateQueries({
          queryKey: queryKeys.fmResidents.buildingUnits(input.buildingCode),
        }),
      ]);
    },
  });
}

export function useAssignPresident(): UseMutationResult<void, unknown, AssignPresidentInput> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: assignPresident,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.bms.propertiesList });
    },
  });
}
