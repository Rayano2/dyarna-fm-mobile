import { ApiError, ERROR_CODES, isUnconfirmedError } from '@/shared/api/errors';
import { toAsciiDigits } from '@/shared/lib/to-ascii-digits';
import type { ProjectBuildingFilter } from '@/shared/lib/project-building-filter';
import type { Resident } from '@/features/residents';
import type {
  PaymentReminderStatus,
  PaymentReminderTargetMode,
  SendPaymentReminderRequest,
} from '../api/mappers';

/** The web's value (client/src/pages/payment-reminders.tsx). */
export const MAX_POLL_FAILURES = 3;
/** The web's poll interval. */
export const POLL_INTERVAL_MS = 2000;
/** Fixed for now: SAR is the only currency the product supports. */
export const REMINDER_CURRENCY = 'SAR';
/** Mirrors the DTO's `@Digits(integer = 10, fraction = 2)`, so it fails in-field. */
export const AMOUNT_PATTERN = /^\d{1,10}(\.\d{1,2})?$/;

/**
 * Decimal separators a decimal pad can type: the Arabic one (U+066B) and the
 * comma that comma-decimal locales show. The Arabic THOUSANDS separator
 * (U+066C) is deliberately not mapped, so "١٬٠٠٠" stays invalid.
 */
const DECIMAL_SEPARATORS = /[٫,]/g;

/** SELECTED beats a filter; a filter beats ALL. There is no manual toggle. */
export function deriveTargetMode(
  selectedCount: number,
  filter: ProjectBuildingFilter,
): PaymentReminderTargetMode {
  if (selectedCount > 0) return 'SELECTED';
  if (filter.projectId !== null || filter.buildingCode !== null) return 'FILTERED';
  return 'ALL';
}

/** ASCII digits and a `.` decimal point, trimmed. */
export function normalizeAmount(raw: string): string {
  return toAsciiDigits(raw).replaceAll(DECIMAL_SEPARATORS, '.').trim();
}

/** The positive amount (at most 10 integer and 2 fraction digits), or null. */
export function parseAmount(raw: string): number | null {
  const normalized = normalizeAmount(raw);
  if (!AMOUNT_PATTERN.test(normalized)) return null;
  const value = Number(normalized);
  return Number.isFinite(value) && value > 0 ? value : null;
}

const pad2 = (n: number): string => String(n).padStart(2, '0');

/**
 * LOCAL calendar date as `yyyy-MM-dd`. Deliberately not `toISOString()`: in
 * Riyadh (UTC+3) a date picked after 21:00 would go out as the previous day.
 */
export function toLocalIsoDate(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** True when `date` falls on a LOCAL day before today. Today itself is allowed. */
export function isDueDateInPast(date: Date, now: Date = new Date()): boolean {
  return date.getTime() < startOfLocalDay(now).getTime();
}

export interface PaymentReminderForm {
  selectedUserIds: ReadonlySet<string>;
  filter: ProjectBuildingFilter;
  title: string;
  message: string;
  amount: string;
  dueDate: Date | undefined;
}

/** Null when the form is not sendable (blank text, bad amount, missing or past date). */
export function buildPaymentReminderPayload(
  form: PaymentReminderForm,
  now: Date = new Date(),
): SendPaymentReminderRequest | null {
  const title = form.title.trim();
  const body = form.message.trim();
  const amount = parseAmount(form.amount);
  if (!title || !body || amount === null) return null;
  if (!form.dueDate || isDueDateInPast(form.dueDate, now)) return null;

  const targetMode = deriveTargetMode(form.selectedUserIds.size, form.filter);
  const payload: SendPaymentReminderRequest = {
    targetMode,
    title,
    body,
    amount,
    currency: REMINDER_CURRENCY,
    dueDate: toLocalIsoDate(form.dueDate),
  };
  if (targetMode === 'SELECTED') {
    payload.userIds = [...form.selectedUserIds];
  } else if (targetMode === 'FILTERED') {
    if (form.filter.projectId !== null) payload.projectId = form.filter.projectId;
    if (form.filter.buildingCode !== null) payload.buildingCode = form.filter.buildingCode;
  }
  return payload;
}

export function isTerminalStatus(status: PaymentReminderStatus | undefined): boolean {
  return status === 'COMPLETED' || status === 'COMPLETED_WITH_ERRORS';
}

/** `refetchInterval`: poll every 2s until the send is finished. */
export function pollIntervalFor(status?: PaymentReminderStatus): number | false {
  return isTerminalStatus(status) ? false : POLL_INTERVAL_MS;
}

/** A send still QUEUED this long after it started (or after "Check again") stops polling. */
export const QUEUED_STALL_MS = 3 * 60_000;

export interface PollState {
  /** Consecutive failed polls. */
  failures: number;
  /** Still QUEUED after QUEUED_STALL_MS. */
  stalled: boolean;
  /** When the current stall window began (epoch ms). */
  windowStart: number;
}

export type PollEvent =
  | { type: 'success'; status: PaymentReminderStatus; now: number }
  | { type: 'failure' }
  | { type: 'resume'; now: number };

export function initialPollState(startedAt: number): PollState {
  return { failures: 0, stalled: false, windowStart: startedAt };
}

/**
 * A success resets the consecutive-failure count and flags a stall once the
 * send has sat in QUEUED for QUEUED_STALL_MS; a failure adds one; "Check
 * again" clears both and opens a fresh stall window.
 */
export function reducePoll(state: PollState, event: PollEvent): PollState {
  if (event.type === 'failure') return { ...state, failures: state.failures + 1 };
  if (event.type === 'resume') return initialPollState(event.now);
  return {
    ...state,
    failures: 0,
    stalled: event.status === 'QUEUED' && event.now - state.windowStart >= QUEUED_STALL_MS,
  };
}

export function isPollStopped(state: PollState): boolean {
  return state.failures >= MAX_POLL_FAILURES || state.stalled;
}

export type CompletionOutcome = 'success' | 'partial';

/** Any failure, or nobody reached at all, is a partial result, not a success. */
export function completionOutcome(send: {
  sentCount: number | undefined;
  failedCount: number | undefined;
}): CompletionOutcome {
  return (send.failedCount ?? 0) === 0 && (send.sentCount ?? 0) > 0 ? 'success' : 'partial';
}

/**
 * The POST never came back (TIMEOUT / REQUEST_FAILED), so the broadcast may
 * already be on its way: the copy must not invite a blind retry.
 */
export function isUnconfirmedSendError(error: unknown): boolean {
  return (
    isUnconfirmedError(error) || (error instanceof ApiError && error.code === ERROR_CODES.TIMEOUT)
  );
}

export interface Latch {
  current: boolean;
}

export interface SendHandlers<R> {
  onSuccess: (result: R) => void;
  onError: (error: unknown) => void;
  onSettled: () => void;
}

/**
 * Synchronous single-flight for the broadcast. `isPending` only flips on the
 * next render, so a double tap on "Yes, send" would otherwise POST twice. The
 * latch is set before `mutate` and released when the mutation settles.
 * Returns whether the send was started.
 */
export function latchedSend<P, R>(
  latch: Latch,
  payload: P,
  mutate: (payload: P, handlers: SendHandlers<R>) => void,
  handlers: Omit<SendHandlers<R>, 'onSettled'>,
): boolean {
  if (latch.current) return false;
  latch.current = true;
  mutate(payload, {
    ...handlers,
    onSettled: () => {
      latch.current = false;
    },
  });
  return true;
}

/**
 * True when a failed send was rejected because of `dueDate` (e.g. the server
 * clock is ahead of the device). Web parity: looks for "dueDate" in the
 * message, the field map, or the usual Spring validation shapes in the body.
 */
export function isDueDateRejection(error: unknown): boolean {
  if (!(error instanceof ApiError)) return false;
  if (mentionsDueDate(error.message)) return true;
  if (error.fields && Object.keys(error.fields).some((key) => mentionsDueDate(key))) return true;
  const raw = error.raw as { errors?: unknown; fieldErrors?: unknown } | null | undefined;
  if (!raw || typeof raw !== 'object') return false;
  return [raw.errors, raw.fieldErrors].some((collection) => {
    if (Array.isArray(collection)) {
      return collection.some((entry) =>
        mentionsDueDate((entry as { field?: unknown } | null)?.field),
      );
    }
    if (collection && typeof collection === 'object') {
      return Object.keys(collection).some((key) => mentionsDueDate(key));
    }
    return false;
  });
}

function mentionsDueDate(value: unknown): boolean {
  return typeof value === 'string' && /duedate/i.test(value);
}

/**
 * The list is one row per unit-link; a resident in two units must appear (and
 * be ticked) once, matching the backend which de-dupes by userId.
 */
export function dedupeResidents(residents: readonly Resident[]): Resident[] {
  const seen = new Set<string>();
  return residents.filter((r) => {
    if (seen.has(r.userId)) return false;
    seen.add(r.userId);
    return true;
  });
}

/** Toggles one id in an immutable selection set. */
export function toggleSelection(selected: ReadonlySet<string>, userId: string): Set<string> {
  const next = new Set(selected);
  if (next.has(userId)) next.delete(userId);
  else next.add(userId);
  return next;
}
