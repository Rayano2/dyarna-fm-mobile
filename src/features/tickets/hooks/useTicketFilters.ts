import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/shared/api/query-keys';
import { STALE } from '@/shared/query';
import { getProjectsBuildingsFilter } from '../api/filters';

/** Projects and their buildings for the filter sheet. Cached 5 minutes. */
export function useTicketFilters() {
  return useQuery({
    queryKey: queryKeys.bms.projectsBuildingsFilter,
    queryFn: getProjectsBuildingsFilter,
    staleTime: STALE.LOOKUP,
  });
}
