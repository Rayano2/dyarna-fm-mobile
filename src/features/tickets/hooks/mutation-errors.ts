import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { queryKeys } from '@/shared/api/query-keys';
import { useToastStore } from '@/shared/stores/toastStore';
import { showApiErrorToast } from '@/shared/ui';
import { isTicketNotFoundError } from '../api/get-ticket';

/**
 * Shared mutation error path. A not-found answer (404 or `TMS_404_01`, e.g. the
 * ticket belongs to another company) gets the "Ticket not found" toast and a
 * detail refetch, which flips the screen into its not-found state. Anything
 * else gets the action's own failure toast.
 */
export function useTicketMutationErrorHandler(
  ticketNumber: string,
  failedKey: string,
): (error: unknown) => void {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const push = useToastStore((s) => s.push);

  return useCallback(
    (error: unknown) => {
      if (isTicketNotFoundError(error)) {
        push({ variant: 'error', title: t('fm.tickets.notFound') });
        void queryClient.invalidateQueries({ queryKey: queryKeys.tms.ticketDetail(ticketNumber) });
        return;
      }
      showApiErrorToast(push, error, t, { fallbackTitle: t(failedKey) });
    },
    [failedKey, push, queryClient, t, ticketNumber],
  );
}
