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
  deleteCompanyLogo,
  getCompanyLogo,
  uploadCompanyLogo,
  type LogoUploadFile,
} from '../api/company-logo-api';

/** The company logo URL, or null when none is set. */
export function useCompanyLogo(): UseQueryResult<string | null> {
  return useQuery({
    queryKey: queryKeys.bms.companyLogo,
    queryFn: getCompanyLogo,
    // A presigned URL: keep it fresh-ish rather than pinned.
    staleTime: STALE.DETAIL,
  });
}

export function useUploadCompanyLogo(): UseMutationResult<void, Error, LogoUploadFile> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file) => uploadCompanyLogo(file),
    onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.bms.companyLogo }),
  });
}

export function useDeleteCompanyLogo(): UseMutationResult<void, Error, void> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => deleteCompanyLogo(),
    onSuccess: () => qc.setQueryData(queryKeys.bms.companyLogo, null),
    onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.bms.companyLogo }),
  });
}
