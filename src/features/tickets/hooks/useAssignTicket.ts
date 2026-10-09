import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/features/auth';
import { queryKeys } from '@/shared/api/query-keys';
import { useToastStore } from '@/shared/stores/toastStore';
import { assignTicket } from '../api/assign-ticket';
import { useTicketMutationErrorHandler } from './mutation-errors';

/** Self-assign ("Assign to me"). The user id is the JWT `sub` (FmUser.id). */
export function useAssignTicket(ticketNumber: string) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const push = useToastStore((s) => s.push);
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const onError = useTicketMutationErrorHandler(ticketNumber, 'fm.tickets.toast.assignFailed');

  return useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error('No signed-in user id');
      await assignTicket(ticketNumber, userId);
    },
    onSuccess: async () => {
      push({ variant: 'success', title: t('fm.tickets.toast.assigned') });
      await queryClient.invalidateQueries({ queryKey: queryKeys.tms.tickets });
    },
    onError,
  });
}
