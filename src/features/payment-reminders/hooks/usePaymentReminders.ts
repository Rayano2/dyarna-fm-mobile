import { useCallback, useState } from 'react';
import {
  useMutation,
  useQuery,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import { queryKeys } from '@/shared/api/query-keys';
import type {
  PaymentReminderQueued,
  PaymentReminderSend,
  SendPaymentReminderRequest,
} from '../api/mappers';
import { fetchPaymentReminderStatus, sendPaymentReminder } from '../api/payment-reminders';
import {
  isPollingStopped,
  nextPollFailures,
  pollIntervalFor,
  shouldPoll,
} from '../lib/payment-reminders-logic';

/** Errors are surfaced by the screen (toast + inline due-date error), not here. */
export function useSendPaymentReminder(): UseMutationResult<
  PaymentReminderQueued,
  unknown,
  SendPaymentReminderRequest
> {
  return useMutation({ mutationFn: sendPaymentReminder });
}

export interface PaymentReminderStatusResult {
  query: UseQueryResult<PaymentReminderSend>;
  /** Gave up after MAX_POLL_FAILURES consecutive failures. */
  stopped: boolean;
  /** Resets the failure counter, which re-enables the poll. */
  resume: () => void;
}

/**
 * Polls a send every 2s until it is COMPLETED / COMPLETED_WITH_ERRORS, and
 * stops after MAX_POLL_FAILURES consecutive failures (web parity). The counter
 * is keyed by sendId, so a new send always starts from zero.
 */
export function usePaymentReminderStatus(sendId: string | null): PaymentReminderStatusResult {
  const [failures, setFailures] = useState<{ sendId: string | null; count: number }>({
    sendId: null,
    count: 0,
  });
  const count = failures.sendId === sendId ? failures.count : 0;

  const record = useCallback(
    (outcome: 'success' | 'failure') =>
      setFailures((prev) => ({
        sendId,
        count: nextPollFailures(prev.sendId === sendId ? prev.count : 0, outcome),
      })),
    [sendId],
  );

  const query = useQuery({
    queryKey: queryKeys.fmPaymentReminders.status(sendId),
    queryFn: async () => {
      try {
        const result = await fetchPaymentReminderStatus(sendId ?? '');
        record('success');
        return result;
      } catch (error) {
        record('failure');
        throw error;
      }
    },
    enabled: shouldPoll(sendId, count),
    refetchInterval: (q) => pollIntervalFor(q.state.data?.status),
    retry: false,
  });

  const resume = useCallback(() => setFailures({ sendId, count: 0 }), [sendId]);

  return { query, stopped: isPollingStopped(count), resume };
}
