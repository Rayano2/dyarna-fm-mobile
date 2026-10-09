import { useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { queryKeys } from '@/shared/api/query-keys';
import { useToastStore } from '@/shared/stores/toastStore';
import {
  ResolveTicketError,
  resolveTicket,
  updateTicketStatus,
  type ResolveStep,
  type ResolveTicketInput,
} from '../api/update-status';
import { isTicketNotFoundError } from '../api/get-ticket';
import { useTicketMutationErrorHandler } from './mutation-errors';

/** Plain status change ("Start progress"). */
export function useUpdateTicketStatus(ticketNumber: string) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const push = useToastStore((s) => s.push);
  const onError = useTicketMutationErrorHandler(ticketNumber, 'fm.tickets.toast.statusFailed');

  return useMutation({
    mutationFn: (status: string) => updateTicketStatus(ticketNumber, status),
    onSuccess: async () => {
      push({ variant: 'success', title: t('fm.tickets.toast.statusUpdated') });
      await queryClient.invalidateQueries({ queryKey: queryKeys.tms.tickets });
    },
    onError,
  });
}

/**
 * Resolve / Not actionable: comment -> attachments -> status. Not atomic, so
 * the steps that already landed are remembered per ticket and skipped on the
 * user's retry (re-posting the note would duplicate it). The memory clears on
 * success.
 */
export function useResolveTicket(ticketNumber: string, onResolved?: () => void) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const push = useToastStore((s) => s.push);
  const handleError = useTicketMutationErrorHandler(ticketNumber, 'fm.tickets.toast.statusFailed');
  const done = useRef<Set<ResolveStep>>(new Set());

  return useMutation({
    mutationFn: (input: ResolveTicketInput) => resolveTicket(input, done.current),
    onSuccess: async () => {
      done.current = new Set();
      push({ variant: 'success', title: t('fm.tickets.toast.statusUpdated') });
      onResolved?.();
      await queryClient.invalidateQueries({ queryKey: queryKeys.tms.tickets });
    },
    onError: (error: unknown) => {
      if (error instanceof ResolveTicketError) {
        done.current = new Set(error.completed);
        if (isTicketNotFoundError(error.cause)) {
          handleError(error.cause);
          return;
        }
        if (error.partial) {
          push({ variant: 'error', title: t('fm.tickets.resolve.partialError') });
          // The note (and maybe files) landed: refresh so the thread shows them.
          void queryClient.invalidateQueries({ queryKey: queryKeys.tms.tickets });
          return;
        }
        handleError(error.cause);
        return;
      }
      handleError(error);
    },
  });
}
