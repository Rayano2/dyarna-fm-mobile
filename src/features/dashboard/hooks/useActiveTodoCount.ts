import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useAuthStore } from '@/features/auth';
import { queryKeys } from '@/shared/api/query-keys';
import { STALE } from '@/shared/query';
import { getActiveTodoCount } from '../api/dashboard-api';

/** The "My tasks" KPI. Fails independently of the dashboard info query. */
export function useActiveTodoCount(): UseQueryResult<number, unknown> {
  const isAuthenticated = useAuthStore((s) => s.status === 'authenticated');
  return useQuery({
    queryKey: queryKeys.bms.todosActive,
    queryFn: getActiveTodoCount,
    enabled: isAuthenticated,
    staleTime: STALE.LIST,
  });
}
