import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { MutationObserver, QueryClient, QueryObserver } from '@tanstack/react-query';
import type { queryKeys } from '@/shared/api/query-keys';
import type {
  PaymentReminderQueued,
  PaymentReminderSend,
  PaymentReminderStatus,
  SendPaymentReminderRequest,
} from '../api/mappers';
import { fetchPaymentReminderStatus, sendPaymentReminder } from '../api/payment-reminders';
import {
  initialPollState,
  isPollStopped,
  latchedSend,
  MAX_POLL_FAILURES,
  POLL_INTERVAL_MS,
  QUEUED_STALL_MS,
  reducePoll,
  type PollState,
} from '../lib/payment-reminders-logic';
import { paymentReminderStatusOptions } from './usePaymentReminders';

// Only the status GET is stubbed; the POST stays real so msw can count it.
vi.mock('../api/payment-reminders', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return { ...actual, fetchPaymentReminderStatus: vi.fn() };
});

const fetchStatus = vi.mocked(fetchPaymentReminderStatus);

function status(value: PaymentReminderStatus): PaymentReminderSend {
  return {
    sendId: '42',
    status: value,
    totalTargeted: 3,
    sentCount: value === 'QUEUED' ? undefined : 3,
    noDeviceCount: value === 'QUEUED' ? undefined : 0,
    failedCount: value === 'QUEUED' ? undefined : 0,
  };
}

type StatusObserver = QueryObserver<
  PaymentReminderSend,
  unknown,
  PaymentReminderSend,
  PaymentReminderSend,
  ReturnType<typeof queryKeys.fmPaymentReminders.status>
>;

/**
 * Drives `paymentReminderStatusOptions` exactly as `usePaymentReminderStatus`
 * does: each poll outcome is folded into a PollState, and the "re-render"
 * pushes the new `enabled` back into the observer.
 */
function startPolling(sentAt: number): {
  readonly state: PollState;
  resume: () => void;
  stop: () => void;
} {
  const client = new QueryClient();
  const holder: { observer?: StatusObserver; state: PollState } = {
    state: initialPollState(sentAt),
  };
  const options = (): ReturnType<typeof paymentReminderStatusOptions> =>
    paymentReminderStatusOptions('42', !isPollStopped(holder.state), (event) => {
      holder.state = reducePoll(holder.state, event);
      queueMicrotask(() => holder.observer?.setOptions(options()));
    });
  holder.observer = new QueryObserver(client, options());
  const unsubscribe = holder.observer.subscribe(() => {});
  return {
    get state() {
      return holder.state;
    },
    resume: () => {
      holder.state = reducePoll(holder.state, { type: 'resume', now: Date.now() });
      holder.observer?.setOptions(options());
    },
    stop: () => {
      unsubscribe();
      client.clear();
    },
  };
}

describe('usePaymentReminderStatus polling (fake timers)', () => {
  let poller: ReturnType<typeof startPolling> | undefined;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-10T09:00:00.000Z'));
    fetchStatus.mockReset();
  });

  afterEach(() => {
    poller?.stop();
    poller = undefined;
    vi.useRealTimers();
  });

  it(`stops after ${MAX_POLL_FAILURES} consecutive failures`, async () => {
    fetchStatus.mockRejectedValue(new Error('offline'));
    poller = startPolling(Date.now());
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS * (MAX_POLL_FAILURES - 1));
    expect(fetchStatus).toHaveBeenCalledTimes(MAX_POLL_FAILURES);
    expect(isPollStopped(poller.state)).toBe(true);

    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS * 10);
    expect(fetchStatus).toHaveBeenCalledTimes(MAX_POLL_FAILURES);
  });

  it('a successful poll resets the failure count, so polling continues', async () => {
    fetchStatus
      .mockRejectedValueOnce(new Error('1'))
      .mockRejectedValueOnce(new Error('2'))
      .mockResolvedValueOnce(status('QUEUED'))
      .mockRejectedValueOnce(new Error('3'))
      .mockRejectedValueOnce(new Error('4'))
      .mockResolvedValue(status('QUEUED'));
    poller = startPolling(Date.now());
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS * 4);
    expect(fetchStatus).toHaveBeenCalledTimes(5);
    expect(poller.state.failures).toBe(2);
    expect(isPollStopped(poller.state)).toBe(false);

    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS);
    expect(fetchStatus).toHaveBeenCalledTimes(6);
    expect(poller.state.failures).toBe(0);
  });

  it('resume re-enables a stopped poll, which then ends on COMPLETED', async () => {
    fetchStatus.mockRejectedValue(new Error('offline'));
    poller = startPolling(Date.now());
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS * (MAX_POLL_FAILURES - 1));
    expect(isPollStopped(poller.state)).toBe(true);

    fetchStatus.mockReset();
    fetchStatus.mockResolvedValue(status('COMPLETED'));
    poller.resume();
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchStatus).toHaveBeenCalledTimes(1);
    expect(isPollStopped(poller.state)).toBe(false);

    // Terminal status: no more polls.
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS * 5);
    expect(fetchStatus).toHaveBeenCalledTimes(1);
  });

  it('stops as "stalled" once the send is still QUEUED after 3 minutes', async () => {
    fetchStatus.mockResolvedValue(status('QUEUED'));
    poller = startPolling(Date.now());
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(QUEUED_STALL_MS - POLL_INTERVAL_MS);
    expect(poller.state.stalled).toBe(false);

    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS);
    expect(poller.state).toMatchObject({ stalled: true, failures: 0 });
    expect(isPollStopped(poller.state)).toBe(true);

    const calls = fetchStatus.mock.calls.length;
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS * 10);
    expect(fetchStatus).toHaveBeenCalledTimes(calls);
  });
});

describe('confirm send (double tap)', () => {
  const server = setupServer();
  const SEND_URL = 'https://bms.test.local/api/bms/payment-reminders';
  const payload: SendPaymentReminderRequest = {
    targetMode: 'ALL',
    title: 'Rent due',
    body: 'Please pay',
    amount: 100,
    currency: 'SAR',
    dueDate: '2026-10-15',
  };

  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it('calling onConfirm twice before a re-render POSTs exactly once', async () => {
    let posts = 0;
    server.use(
      http.post(SEND_URL, () => {
        posts += 1;
        return HttpResponse.json(
          { sendId: 42, status: 'QUEUED', totalTargeted: 3 },
          { status: 202 },
        );
      }),
    );
    const client = new QueryClient({ defaultOptions: { mutations: { retry: 0 } } });
    const observer = new MutationObserver<
      PaymentReminderQueued,
      unknown,
      SendPaymentReminderRequest
    >(client, { mutationFn: sendPaymentReminder });
    // useMutation subscribes; per-call callbacks (onSettled) only fire with a listener.
    const unsubscribe = observer.subscribe(() => {});
    const latch = { current: false };
    const results: PaymentReminderQueued[] = [];
    // The screen's onConfirm, with `sendMutation.mutate` swapped for the observer.
    const onConfirm = (): boolean =>
      latchedSend(
        latch,
        payload,
        (variables, handlers) => {
          observer.mutate(variables, handlers).catch(() => {});
        },
        { onSuccess: (result: PaymentReminderQueued) => results.push(result), onError: () => {} },
      );

    expect(onConfirm()).toBe(true);
    expect(onConfirm()).toBe(false);
    await vi.waitFor(() => expect(latch.current).toBe(false));
    expect(posts).toBe(1);
    expect(results).toEqual([{ sendId: '42', status: 'QUEUED', totalTargeted: 3 }]);

    // Once settled the latch is released: a deliberate second send goes through.
    expect(onConfirm()).toBe(true);
    await vi.waitFor(() => expect(posts).toBe(2));
    unsubscribe();
    client.clear();
  });
});
