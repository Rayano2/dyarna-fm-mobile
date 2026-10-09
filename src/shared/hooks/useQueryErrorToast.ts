import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ApiError, getUserMessage } from '@/shared/api/errors';
import { useToastStore } from '@/shared/stores/toastStore';

// Surface a toast each time a React Query observer transitions into a new
// failure. errorUpdatedAt is React Query's stable signal that "a new error
// just happened" — it ticks only on failure, not on every render, so the
// toast fires once per failed refetch / load-more attempt instead of on
// every render.
export function useQueryErrorToast(error: unknown, errorUpdatedAt: number | undefined): void {
  const { t } = useTranslation();
  const push = useToastStore((s) => s.push);
  useEffect(() => {
    if (!error || !errorUpdatedAt) return;
    const title = error instanceof ApiError ? getUserMessage(error, t) : t('errors.generic');
    push({ variant: 'error', title });
  }, [error, errorUpdatedAt, push, t]);
}
