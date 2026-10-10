import { useCallback, useState } from 'react';
import {
  useMutation,
  useQuery,
  type QueryObserverOptions,
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
  initialPollState,
  isPollStopped,
  pollIntervalFor,
  reducePoll,
  type PollEvent,
  type PollState,
} from '../lib/payment-reminders-logic';

/** Errors are surfaced by the screen (toast + inline due-date error), not here. */
export function useSendPaymentReminder(): UseMutationResult<
  PaymentReminderQueued,
  unknown,
  SendPaymentReminderRequest
> {
  return useMutation({ mutationFn: sendPaymentReminder });
}

type StatusKey = ReturnType<typeof queryKeys.fmPaymentReminders.status>;

/**
 * The status query, built outside React so it can be driven by a
 * QueryObserver in tests. Every poll reports its outcome through `onPoll`;
 * the caller folds it into a PollState (`reducePoll`) and flips `enabled`.
 */
export function paymentReminderStatusOptions(
  sendId: string | null,
  enabled: boolean,
  onPoll: (event: PollEvent) => void,
): QueryObserverOptions<
  PaymentReminderSend,
  unknown,
  PaymentReminderSend,
  PaymentReminderSend,
  StatusKey
> {
  return {
    queryKey: queryKeys.fmPaymentReminders.status(sendId),
    queryFn: async () => {
      try {
        const result = await fetchPaymentReminderStatus(sendId ?? '');
        onPoll({ type: 'success', status: result.status, now: Date.now() });
        return result;
      } catch (error) {
        onPoll({ type: 'failure' });
        throw error;
      }
    },
    enabled: sendId !== null && enabled,
    refetchInterval: (query) => pollIntervalFor(query.state.data?.status),
    retry: false,
  };
}

export interface ActiveSend {
  sendId: string;
  /** When the 202 came back (epoch ms): starts the "still queued" window. */
  sentAt: number;
}

export interface PaymentReminderStatusResult {
  query: UseQueryResult<PaymentReminderSend, unknown>;
  /** Gave up: MAX_POLL_FAILURES consecutive failures, or still QUEUED after 3 minutes. */
  stopped: boolean;
  /** Stopped because the send is still QUEUED (not because polls failed). */
  stalled: boolean;
  /** "Check again": clears the failures and opens a fresh stall window. */
  resume: () => void;
}

/**
 * Polls a send every 2s until COMPLETED / COMPLETED_WITH_ERRORS (web parity),
 * stopping after MAX_POLL_FAILURES consecutive failures or once it has sat in
 * QUEUED for QUEUED_STALL_MS. The state is keyed by sendId, so a new send
 * always starts clean.
 */
export function usePaymentReminderStatus(send: ActiveSend | null): PaymentReminderStatusResult {
  const sendId = send?.sendId ?? null;
  const sentAt = send?.sentAt ?? 0;
  const [tracked, setTracked] = useState<{ sendId: string | null; poll: PollState } | null>(null);
  const poll = tracked?.sendId === sendId ? tracked.poll : initialPollState(sentAt);

  const dispatch = useCallback(
    (event: PollEvent) =>
      setTracked((prev) => ({
        sendId,
        poll: reducePoll(prev?.sendId === sendId ? prev.poll : initialPollState(sentAt), event),
      })),
    [sendId, sentAt],
  );

  const query = useQuery(paymentReminderStatusOptions(sendId, !isPollStopped(poll), dispatch));
  const resume = useCallback(() => dispatch({ type: 'resume', now: Date.now() }), [dispatch]);

  return { query, stopped: isPollStopped(poll), stalled: poll.stalled, resume };
}
