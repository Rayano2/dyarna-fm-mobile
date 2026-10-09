import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { queryKeys } from '@/shared/api/query-keys';
import { STALE } from '@/shared/query';
import { getScopeProjects, type ScopeProject } from '../api/projects-buildings';

/**
 * The rep's projects and buildings, for the scope pickers on the community
 * screens. Lives in `features/scope` until it is consolidated with the other
 * branches' project/building hooks (see the T10 brief).
 */
export function useScopeProjects(): UseQueryResult<ScopeProject[]> {
  return useQuery({
    queryKey: queryKeys.bms.projectsBuildingsFilter,
    queryFn: getScopeProjects,
    staleTime: STALE.LOOKUP,
  });
}
