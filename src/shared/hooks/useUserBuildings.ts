import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/shared/api/query-keys';
import { getUserBuildings } from '@/shared/api/user-buildings';
import { STALE } from '@/shared/query';

/**
 * Single cache entry for `/api/bms/building/user/buildings`, shared by
 * the ticket composer and the profile contacts screen. Callers own the
 * `enabled` gate — the two consumers fetch under different conditions.
 */
export function useUserBuildings(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.bms.userBuildings,
    queryFn: getUserBuildings,
    enabled,
    staleTime: STALE.LOOKUP,
  });
}
