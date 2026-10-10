import { z } from 'zod';
import type { AppTheme } from '@/shared/theme/themes';
import type { Icons } from '@/shared/ui';

/**
 * Booking status → colour key, icon and label. Adapted from dyarna-rn
 * `facilities/lib/facility-meta.ts` (the booking-status half) with FM i18n
 * keys. Status is always icon + text; colour is never the only signal.
 */

export type BookingStatusColorKey = Extract<
  keyof AppTheme['colors'],
  'error' | 'warning' | 'success' | 'textMuted' | 'terracotta'
>;

export function bookingStatusColorKey(status: string | undefined): BookingStatusColorKey {
  switch ((status ?? '').trim().toUpperCase()) {
    case 'PENDING': {
      return 'warning';
    }
    case 'APPROVED': {
      return 'success';
    }
    case 'REJECTED': {
      return 'error';
    }
    case 'NO_SHOW': {
      return 'terracotta';
    }
    default: {
      return 'textMuted';
    }
  }
}

export function bookingStatusIcon(status: string | undefined): keyof typeof Icons {
  switch ((status ?? '').trim().toUpperCase()) {
    case 'PENDING': {
      return 'Clock';
    }
    case 'APPROVED': {
      return 'CheckCircle';
    }
    case 'REJECTED': {
      return 'XCircle';
    }
    case 'CANCELLED': {
      return 'Prohibit';
    }
    case 'COMPLETED': {
      return 'SealCheck';
    }
    case 'NO_SHOW': {
      return 'Warning';
    }
    default: {
      return 'Info';
    }
  }
}

const STATUS_KEYS: Readonly<Record<string, string>> = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed',
  NO_SHOW: 'noShow',
};

/** Localized label; an unknown server code is shown raw rather than swallowed. */
export function bookingStatusLabel(status: string | undefined, t: (key: string) => string): string {
  const code = (status ?? '').trim().toUpperCase();
  const key = STATUS_KEYS[code];
  return key ? t(`fm.bookings.status.${key}`) : code;
}

export const REJECT_REASON_MAX = 500;

/** Reject reason: required once trimmed, at most 500 characters. */
export const rejectReasonSchema = z
  .string()
  .trim()
  .min(1, { error: 'fm.bookings.reasonRequired' })
  .max(REJECT_REASON_MAX, { error: 'fm.bookings.reasonTooLong' });

/** The i18n key of the first problem with `reason`, or null when it can be sent. */
export function rejectReasonError(reason: string): string | null {
  const result = rejectReasonSchema.safeParse(reason);
  return result.success ? null : (result.error.issues[0]?.message ?? 'fm.bookings.reasonRequired');
}
