import { afterEach, describe, expect, it } from 'vitest';
import { ApiError, ERROR_CODES } from '@/shared/api/errors';
import { EMPTY_PROJECT_BUILDING_FILTER } from '@/shared/lib/project-building-filter';
import { mapQueued, mapReminderStatus, mapSend } from '../api/mappers';
import {
  buildPaymentReminderPayload,
  completionOutcome,
  deriveTargetMode,
  initialPollState,
  isDueDateInPast,
  isDueDateRejection,
  isPollStopped,
  isUnconfirmedSendError,
  latchedSend,
  MAX_POLL_FAILURES,
  normalizeAmount,
  parseAmount,
  pollIntervalFor,
  QUEUED_STALL_MS,
  reducePoll,
  toLocalIsoDate,
  toggleSelection,
  type PaymentReminderForm,
  type PollState,
} from './payment-reminders-logic';

const NOW = new Date(2026, 9, 10, 12, 0, 0); // 10 Oct 2026, local noon
const U1 = '3f2b9c1e-0000-4000-8000-000000000001';
const U2 = '3f2b9c1e-0000-4000-8000-000000000002';

function form(overrides: Partial<PaymentReminderForm> = {}): PaymentReminderForm {
  return {
    selectedUserIds: new Set(),
    filter: EMPTY_PROJECT_BUILDING_FILTER,
    title: '  Rent due  ',
    message: ' Please pay ',
    amount: '1500.50',
    dueDate: new Date(2026, 9, 15),
    ...overrides,
  };
}

afterEach(() => {
  delete process.env.TZ;
});

describe('deriveTargetMode', () => {
  it('is ALL with no selection and no filter', () => {
    expect(deriveTargetMode(0, EMPTY_PROJECT_BUILDING_FILTER)).toBe('ALL');
  });

  it('is FILTERED when a project or a building is chosen', () => {
    expect(deriveTargetMode(0, { projectId: 4, buildingCode: null })).toBe('FILTERED');
    expect(deriveTargetMode(0, { projectId: 4, buildingCode: 'B-1' })).toBe('FILTERED');
    expect(deriveTargetMode(0, { projectId: null, buildingCode: 'B-1' })).toBe('FILTERED');
  });

  it('is SELECTED whenever anyone is ticked, even with a filter', () => {
    expect(deriveTargetMode(1, EMPTY_PROJECT_BUILDING_FILTER)).toBe('SELECTED');
    expect(deriveTargetMode(2, { projectId: 4, buildingCode: 'B-1' })).toBe('SELECTED');
  });
});

describe('amount', () => {
  it('normalises Arabic-Indic and Persian digits and the Arabic decimal separator', () => {
    expect(normalizeAmount(' ١٥٠٠٫٥ ')).toBe('1500.5');
    expect(normalizeAmount('۲۵۰')).toBe('250');
    expect(parseAmount('١٥٠٠٫٥٠')).toBe(1500.5);
  });

  it('must be greater than 0', () => {
    expect(parseAmount('0')).toBeNull();
    expect(parseAmount('0.00')).toBeNull();
    expect(parseAmount('-5')).toBeNull();
    expect(parseAmount('')).toBeNull();
    expect(parseAmount('abc')).toBeNull();
    expect(parseAmount('0.01')).toBe(0.01);
  });

  it('mirrors @Digits(integer = 10, fraction = 2)', () => {
    expect(parseAmount('12.345')).toBeNull();
    expect(parseAmount('12345678901')).toBeNull();
    expect(parseAmount('1234567890.99')).toBe(1_234_567_890.99);
  });

  it('reads a comma as the decimal separator but keeps rejecting U+066C', () => {
    expect(normalizeAmount('12,5')).toBe('12.5');
    expect(parseAmount('12,50')).toBe(12.5);
    // "1,000" becomes "1.000": three decimals, so still rejected.
    expect(parseAmount('1,000')).toBeNull();
    // Arabic thousands separator is not a decimal point.
    expect(parseAmount('١٬٠٠٠')).toBeNull();
    expect(normalizeAmount('١٬٠٠٠')).toBe('1٬000');
  });
});

describe('local due date', () => {
  it('formats the LOCAL calendar day as yyyy-MM-dd', () => {
    expect(toLocalIsoDate(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('keeps the Riyadh day after 21:00, where toISOString would roll back', () => {
    process.env.TZ = 'Asia/Riyadh';
    const lateEvening = new Date('2026-10-14T21:30:00.000Z'); // 00:30 on the 15th in Riyadh
    expect(toLocalIsoDate(lateEvening)).toBe('2026-10-15');
    expect(lateEvening.toISOString().slice(0, 10)).toBe('2026-10-14');
  });

  it('rejects dates before local today and accepts today', () => {
    expect(isDueDateInPast(new Date(2026, 9, 9, 23, 59), NOW)).toBe(true);
    expect(isDueDateInPast(new Date(2026, 9, 10), NOW)).toBe(false);
    expect(isDueDateInPast(new Date(2026, 9, 11), NOW)).toBe(false);
  });

  it('uses the local day, not the UTC one (Riyadh just after midnight)', () => {
    process.env.TZ = 'Asia/Riyadh';
    // 00:30 on 11 Oct in Riyadh is still 10 Oct in UTC.
    const now = new Date('2026-10-10T21:30:00.000Z');
    expect(isDueDateInPast(new Date(2026, 9, 10), now)).toBe(true);
    expect(isDueDateInPast(new Date(2026, 9, 11), now)).toBe(false);
  });
});

describe('buildPaymentReminderPayload', () => {
  it('ALL: no audience fields, trimmed text, SAR, local date', () => {
    expect(buildPaymentReminderPayload(form(), NOW)).toEqual({
      targetMode: 'ALL',
      title: 'Rent due',
      body: 'Please pay',
      amount: 1500.5,
      currency: 'SAR',
      dueDate: '2026-10-15',
    });
  });

  it('FILTERED: projectId as a number and the buildingCode, never userIds', () => {
    const payload = buildPaymentReminderPayload(
      form({ filter: { projectId: 7, buildingCode: 'B-12' } }),
      NOW,
    );
    expect(payload).toMatchObject({ targetMode: 'FILTERED', projectId: 7, buildingCode: 'B-12' });
    expect(typeof payload?.projectId).toBe('number');
    expect(payload).not.toHaveProperty('userIds');
  });

  it('FILTERED by project only omits buildingCode', () => {
    const payload = buildPaymentReminderPayload(
      form({ filter: { projectId: 7, buildingCode: null } }),
      NOW,
    );
    expect(payload).toMatchObject({ targetMode: 'FILTERED', projectId: 7 });
    expect(payload).not.toHaveProperty('buildingCode');
  });

  it('SELECTED: only userIds, even while a filter is active', () => {
    const payload = buildPaymentReminderPayload(
      form({ selectedUserIds: new Set([U1, U2]), filter: { projectId: 7, buildingCode: 'B-12' } }),
      NOW,
    );
    expect(payload).toMatchObject({ targetMode: 'SELECTED', userIds: [U1, U2] });
    expect(payload).not.toHaveProperty('projectId');
    expect(payload).not.toHaveProperty('buildingCode');
  });

  it('sends Arabic-Indic digits as an ASCII number', () => {
    expect(buildPaymentReminderPayload(form({ amount: '٢٠٠٫٧٥' }), NOW)?.amount).toBe(200.75);
  });

  it('sends the LOCAL day in Riyadh for a late-evening pick', () => {
    process.env.TZ = 'Asia/Riyadh';
    const now = new Date('2026-10-14T09:00:00.000Z');
    const picked = new Date('2026-10-14T21:30:00.000Z'); // 15 Oct, 00:30 local
    expect(buildPaymentReminderPayload(form({ dueDate: picked }), now)?.dueDate).toBe('2026-10-15');
  });

  it('is null for an invalid form', () => {
    expect(buildPaymentReminderPayload(form({ amount: '0' }), NOW)).toBeNull();
    expect(buildPaymentReminderPayload(form({ title: '   ' }), NOW)).toBeNull();
    expect(buildPaymentReminderPayload(form({ message: '' }), NOW)).toBeNull();
    expect(buildPaymentReminderPayload(form({ dueDate: undefined }), NOW)).toBeNull();
    expect(buildPaymentReminderPayload(form({ dueDate: new Date(2026, 9, 9) }), NOW)).toBeNull();
  });
});

describe('status mapper', () => {
  it('maps the three BMS statuses and treats anything else as QUEUED', () => {
    expect(mapReminderStatus('COMPLETED')).toBe('COMPLETED');
    expect(mapReminderStatus('COMPLETED_WITH_ERRORS')).toBe('COMPLETED_WITH_ERRORS');
    expect(mapReminderStatus('QUEUED')).toBe('QUEUED');
    expect(mapReminderStatus('completed')).toBe('COMPLETED');
    expect(mapReminderStatus(null)).toBe('QUEUED');
    expect(mapReminderStatus('PROCESSING')).toBe('QUEUED');
  });

  it('maps the 202 body, turning the Long sendId into a string', () => {
    expect(mapQueued({ sendId: 42, status: 'QUEUED', totalTargeted: 17 })).toEqual({
      sendId: '42',
      status: 'QUEUED',
      totalTargeted: 17,
    });
  });

  it('leaves counters undefined while QUEUED (NON_NULL omits them)', () => {
    expect(mapSend({ sendId: 42, status: 'QUEUED', totalTargeted: 17 })).toEqual({
      sendId: '42',
      status: 'QUEUED',
      totalTargeted: 17,
      sentCount: undefined,
      noDeviceCount: undefined,
      failedCount: undefined,
    });
  });

  it('maps a completed send with its counters', () => {
    expect(
      mapSend({
        sendId: 42,
        status: 'COMPLETED_WITH_ERRORS',
        totalTargeted: 10,
        sentCount: 7,
        noDeviceCount: 2,
        failedCount: 1,
      }),
    ).toMatchObject({
      status: 'COMPLETED_WITH_ERRORS',
      sentCount: 7,
      noDeviceCount: 2,
      failedCount: 1,
    });
  });

  it('throws without a sendId', () => {
    expect(() => mapQueued({ status: 'QUEUED' })).toThrow();
  });
});

describe('polling', () => {
  it('polls every 2s until a terminal status', () => {
    expect(pollIntervalFor()).toBe(2000);
    expect(pollIntervalFor('QUEUED')).toBe(2000);
    expect(pollIntervalFor('COMPLETED')).toBe(false);
    expect(pollIntervalFor('COMPLETED_WITH_ERRORS')).toBe(false);
  });

  it('takes the web cap of 3 consecutive failures', () => {
    expect(MAX_POLL_FAILURES).toBe(3);
  });

  it('stops after MAX_POLL_FAILURES consecutive failures', () => {
    let state = initialPollState(0);
    for (let i = 0; i < MAX_POLL_FAILURES - 1; i += 1) {
      state = reducePoll(state, { type: 'failure' });
      expect(isPollStopped(state)).toBe(false);
    }
    state = reducePoll(state, { type: 'failure' });
    expect(isPollStopped(state)).toBe(true);
  });

  it('a success resets the count, so only consecutive failures stop the poll', () => {
    let state = reducePoll(reducePoll(initialPollState(0), { type: 'failure' }), {
      type: 'failure',
    });
    state = reducePoll(state, { type: 'success', status: 'QUEUED', now: 1000 });
    expect(state.failures).toBe(0);
    state = reducePoll(state, { type: 'failure' });
    expect(isPollStopped(state)).toBe(false);
  });

  it('stalls once a send is still QUEUED 3 minutes after it started', () => {
    const start = 10_000;
    const queued = (now: number) =>
      reducePoll(initialPollState(start), { type: 'success', status: 'QUEUED', now });
    expect(QUEUED_STALL_MS).toBe(180_000);
    expect(isPollStopped(queued(start + QUEUED_STALL_MS - 1))).toBe(false);
    expect(queued(start + QUEUED_STALL_MS)).toMatchObject({ stalled: true });
    expect(isPollStopped(queued(start + QUEUED_STALL_MS))).toBe(true);
  });

  it('resume clears failures and the stall, and opens a fresh window', () => {
    const stopped: PollState = { failures: 3, stalled: true, windowStart: 0 };
    expect(reducePoll(stopped, { type: 'resume', now: 500_000 })).toEqual({
      failures: 0,
      stalled: false,
      windowStart: 500_000,
    });
  });
});

describe('completionOutcome', () => {
  it('is success only when someone was reached and nothing failed', () => {
    expect(completionOutcome({ sentCount: 5, failedCount: 0 })).toBe('success');
    expect(completionOutcome({ sentCount: 5, failedCount: 1 })).toBe('partial');
  });

  it('treats nobody reached (sentCount 0) as partial, not success', () => {
    expect(completionOutcome({ sentCount: 0, failedCount: 0 })).toBe('partial');
    expect(completionOutcome({ sentCount: undefined, failedCount: undefined })).toBe('partial');
  });
});

function coded(code: string, status = 0): ApiError {
  return new ApiError({ code, status, service: 'bms', raw: null });
}

describe('isUnconfirmedSendError', () => {
  it('is true for REQUEST_FAILED and TIMEOUT only', () => {
    expect(isUnconfirmedSendError(coded(ERROR_CODES.REQUEST_FAILED))).toBe(true);
    expect(isUnconfirmedSendError(coded(ERROR_CODES.TIMEOUT))).toBe(true);
    expect(isUnconfirmedSendError(coded(ERROR_CODES.NETWORK))).toBe(false);
    expect(isUnconfirmedSendError(coded('BMS_500_00', 500))).toBe(false);
    expect(isUnconfirmedSendError(new Error('boom'))).toBe(false);
  });
});

describe('latchedSend', () => {
  it('lets one send through until it settles', () => {
    const latch = { current: false };
    const calls: { onSettled: () => void }[] = [];
    const mutate = (_payload: string, handlers: { onSettled: () => void }): void => {
      calls.push(handlers);
    };
    const handlers = { onSuccess: () => {}, onError: () => {} };
    expect(latchedSend(latch, 'p', mutate, handlers)).toBe(true);
    expect(latchedSend(latch, 'p', mutate, handlers)).toBe(false);
    expect(calls).toHaveLength(1);
    calls[0]?.onSettled();
    expect(latchedSend(latch, 'p', mutate, handlers)).toBe(true);
    expect(calls).toHaveLength(2);
  });
});

function err(message: string, raw: unknown = {}, fields?: Record<string, string>): ApiError {
  return new ApiError({
    code: 'BMS_400_00',
    message,
    status: 400,
    service: 'bms',
    ...(fields ? { fields } : {}),
    raw,
  });
}

describe('isDueDateRejection', () => {
  it('spots dueDate in the message, the field map or a Spring errors array', () => {
    expect(isDueDateRejection(err('dueDate must be today or later'))).toBe(true);
    expect(isDueDateRejection(err('Bad request', {}, { dueDate: 'past' }))).toBe(true);
    expect(isDueDateRejection(err('Bad request', { errors: [{ field: 'dueDate' }] }))).toBe(true);
    expect(isDueDateRejection(err('Bad request', { fieldErrors: { dueDate: 'x' } }))).toBe(true);
  });

  it('is false for anything else', () => {
    expect(isDueDateRejection(err('Internal server error'))).toBe(false);
    expect(isDueDateRejection(new Error('dueDate'))).toBe(false);
  });
});

describe('toggleSelection', () => {
  it('adds and removes without mutating the input', () => {
    const empty = new Set<string>();
    const one = toggleSelection(empty, U1);
    expect([...one]).toEqual([U1]);
    expect(empty.size).toBe(0);
    expect(toggleSelection(one, U1).size).toBe(0);
  });
});
