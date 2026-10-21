import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/features/auth';
import { queryKeys } from '@/shared/api/query-keys';
import { useToastStore } from '@/shared/stores/toastStore';
import { assignErrorKind, assignTicket, type AssignErrorKind } from '../api/assign-ticket';
import { useTicketMutationErrorHandler } from './mutation-errors';

const ASSIGN_ERROR_KEYS: Record<Exclude<AssignErrorKind, 'notFound'>, string> = {
  statusInvalid: 'fm.tickets.assignee.errors.statusInvalid',
  notEligible: 'fm.tickets.assignee.errors.notEligible',
  forbidden: 'fm.tickets.assignee.errors.forbidden',
};

/**
 * Assign or reassign to any eligible user (`mutate(userId)`), the signed-in
 * FM included — their id is the JWT `sub` (FmUser.id).
 */
export function useAssignTicket(ticketNumber: string) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const push = useToastStore((s) => s.push);
  const myId = useAuthStore((s) => s.user?.id ?? null);
  const onOtherError = useTicketMutationErrorHandler(ticketNumber, 'fm.tickets.toast.assignFailed');

  const refresh = async (): Promise<void> => {
    await Promise.all([
      // Prefix: detail, every list and the assignable users of this ticket.
      queryClient.invalidateQueries({ queryKey: queryKeys.tms.tickets }),
      // Dashboard KPIs + top open tickets move with an assignment.
      queryClient.invalidateQueries({ queryKey: queryKeys.bms.dashboardInfo }),
    ]);
  };

  return useMutation({
    mutationFn: async (userId: string) => {
      await assignTicket(ticketNumber, userId);
      return userId;
    },
    onSuccess: async (userId) => {
      push({
        variant: 'success',
        title: t(userId === myId ? 'fm.tickets.toast.assigned' : 'fm.tickets.toast.reassigned'),
      });
      await refresh();
    },
    onError: (error) => {
      const kind = assignErrorKind(error);
      // Not-found keeps the shared path (toast + detail refetch -> not-found state).
      if (kind === null || kind === 'notFound') {
        onOtherError(error);
        return;
      }
      push({ variant: 'error', title: t(ASSIGN_ERROR_KEYS[kind]) });
      // The ticket or the eligible list changed under us: show the truth.
      if (kind !== 'forbidden') void refresh();
    },
  });
}
