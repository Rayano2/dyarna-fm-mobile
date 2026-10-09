import { safeToLocaleDateString, safeToLocaleString } from '@/shared/lib/safe-intl';

/**
 * Display formatting for bookings, in LOCAL time only. Adapted from dyarna-rn
 * `facilities/lib/format-booking-time.ts`. Times and dates are rendered in an
 * LTR span by the caller.
 */

function tag(locale: 'en' | 'ar'): string {
  return locale === 'ar' ? 'ar-SA' : 'en-US';
}

export function formatTime(date: Date, locale: 'en' | 'ar'): string {
  return safeToLocaleString(date, tag(locale), { hour: 'numeric', minute: '2-digit' });
}

export function formatTimeRange(
  start: Date | undefined,
  end: Date | undefined,
  locale: 'en' | 'ar',
): string {
  if (!start) return '';
  return end
    ? `${formatTime(start, locale)} – ${formatTime(end, locale)}`
    : formatTime(start, locale);
}

/** Agenda section header, e.g. "Tue, Oct 14". */
export function formatDayHeader(date: Date, locale: 'en' | 'ar'): string {
  return safeToLocaleDateString(date, tag(locale), {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDate(date: Date, locale: 'en' | 'ar'): string {
  return safeToLocaleDateString(date, tag(locale), {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatWeekday(date: Date, locale: 'en' | 'ar'): string {
  return safeToLocaleDateString(date, tag(locale), { weekday: 'short' });
}
