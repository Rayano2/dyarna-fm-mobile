import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useAuthStore } from '@/features/auth';
import { queryKeys } from '@/shared/api/query-keys';
import { STALE } from '@/shared/query';
import { getDashboardInfo, type DashboardInfo } from '../api/dashboard-api';

export function useDashboardInfo(): UseQueryResult<DashboardInfo, unknown> {
  const isAuthenticated = useAuthStore((s) => s.status === 'authenticated');
  return useQuery({
    queryKey: queryKeys.bms.dashboardInfo,
    queryFn: getDashboardInfo,
    enabled: isAuthenticated,
    staleTime: STALE.LIST,
  });
}
