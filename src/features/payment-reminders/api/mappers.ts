import { asNumberLoose, asString, asStringOrUndef } from '@/shared/api/coerce';

/** BMS `PaymentReminderSend.TargetMode`. */
export type PaymentReminderTargetMode = 'ALL' | 'FILTERED' | 'SELECTED';

/** BMS `PaymentReminderSend.SendStatus`. There is no PROCESSING state on the server. */
export type PaymentReminderStatus = 'QUEUED' | 'COMPLETED' | 'COMPLETED_WITH_ERRORS';

/** Body of `POST api/bms/payment-reminders` (BMS `SendPaymentReminderRequest`). */
export interface SendPaymentReminderRequest {
  targetMode: PaymentReminderTargetMode;
  /** `Long` on the DTO: sent as a number. Only honoured for FILTERED. */
  projectId?: number;
  /** Only honoured for FILTERED. */
  buildingCode?: string;
  /** `List<UUID>`. Only meaningful for SELECTED. */
  userIds?: string[];
  title: string;
  body: string;
  /** `@Positive @Digits(integer = 10, fraction = 2) BigDecimal`. */
  amount: number;
  currency: string;
  /** `LocalDate`, so a plain LOCAL `yyyy-MM-dd`. `@FutureOrPresent`. */
  dueDate: string;
}

/** 202 body (BMS `PaymentReminderQueuedResponse`). */
export interface PaymentReminderQueued {
  /** A `Long` on the server, kept as a string here for the URL and the cache key. */
  sendId: string;
  status: PaymentReminderStatus;
  totalTargeted: number;
}

/**
 * `GET api/bms/payment-reminders/{sendId}` (BMS `PaymentReminderSendResponse`).
 * The DTO is `@JsonInclude(NON_NULL)` and the counters are only written once
 * the send completes, so they are absent while QUEUED.
 */
export interface PaymentReminderSend {
  sendId: string;
  status: PaymentReminderStatus;
  totalTargeted: number | undefined;
  sentCount: number | undefined;
  noDeviceCount: number | undefined;
  failedCount: number | undefined;
}

const STATUSES: readonly PaymentReminderStatus[] = ['QUEUED', 'COMPLETED', 'COMPLETED_WITH_ERRORS'];

/** An unknown or missing status reads as QUEUED, which keeps the poll going. */
export function mapReminderStatus(raw: unknown): PaymentReminderStatus {
  const value = asString(raw).toUpperCase();
  return (STATUSES as readonly string[]).includes(value)
    ? (value as PaymentReminderStatus)
    : 'QUEUED';
}

function mapSendId(raw: unknown): string {
  if (typeof raw === 'number' && Number.isFinite(raw)) return String(raw);
  const id = asStringOrUndef(raw);
  if (!id) throw new Error('payment reminder without a sendId');
  return id;
}

function optCount(raw: unknown): number | undefined {
  if (raw === null || raw === undefined) return undefined;
  const n = asNumberLoose(raw, Number.NaN);
  return Number.isFinite(n) ? n : undefined;
}

export function mapQueued(raw: unknown): PaymentReminderQueued {
  const obj = (raw ?? {}) as Record<string, unknown>;
  return {
    sendId: mapSendId(obj.sendId),
    status: mapReminderStatus(obj.status),
    totalTargeted: optCount(obj.totalTargeted) ?? 0,
  };
}

export function mapSend(raw: unknown): PaymentReminderSend {
  const obj = (raw ?? {}) as Record<string, unknown>;
  return {
    sendId: mapSendId(obj.sendId),
    status: mapReminderStatus(obj.status),
    totalTargeted: optCount(obj.totalTargeted),
    sentCount: optCount(obj.sentCount),
    noDeviceCount: optCount(obj.noDeviceCount),
    failedCount: optCount(obj.failedCount),
  };
}
