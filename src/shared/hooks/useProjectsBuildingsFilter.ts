import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import {
  fetchProjectsBuildingsFilter,
  type FilterProject,
} from '@/shared/api/project-buildings-filter';
import { queryKeys } from '@/shared/api/query-keys';
import { STALE } from '@/shared/query';

/** Options for the FM project/building filter sheet. */
export function useProjectsBuildingsFilter(): UseQueryResult<FilterProject[]> {
  return useQuery({
    queryKey: queryKeys.bms.projectsBuildingsFilter,
    queryFn: fetchProjectsBuildingsFilter,
    staleTime: STALE.LOOKUP,
  });
}
