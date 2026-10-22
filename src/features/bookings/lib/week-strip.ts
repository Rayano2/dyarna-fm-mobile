import type { TFunction } from 'i18next';
import { formatDayHeader, formatMonthDay } from './format-booking-time';

/** Badges cap here; anything above shows as "99+". */
export const MAX_DAY_COUNT = 99;

/**
 * i18n key of a day's short weekday label (0 = Sunday, as `Date.getDay`).
 * A static map rather than Intl: Arabic `weekday:'narrow'` gives ambiguous
 * single letters, and `'short'` is too wide for a seven-cell row.
 */
export function weekdayShortKey(date: Date): string {
  return `fm.bookings.weekdayShort.${date.getDay()}`;
}

/** The header label, e.g. "Oct 19 – Oct 25", from the first and last strip day. */
export function formatWeekRange(days: readonly Date[], locale: 'en' | 'ar', t: TFunction): string {
  const first = days[0];
  const last = days.at(-1);
  if (!first || !last) return '';
  return t('fm.bookings.weekRange', {
    from: formatMonthDay(first, locale),
    to: formatMonthDay(last, locale),
  });
}

/** Count badge text: the number up to 99, then "99+". */
export function formatDayCount(count: number): string {
  return count > MAX_DAY_COUNT ? `${MAX_DAY_COUNT}+` : String(count);
}

/**
 * A day cell's screen-reader label, built from whole i18n keys (no string
 * concatenation, so each locale owns its punctuation): "today" goes inside the
 * day part, and while the week loads a loading label replaces the count,
 * which is not known yet.
 */
export function dayA11yLabel(
  day: Date,
  locale: 'en' | 'ar',
  { count, isToday, loading }: { count: number; isToday: boolean; loading: boolean },
  t: TFunction,
): string {
  const header = formatDayHeader(day, locale);
  const dayPart = isToday ? t('fm.bookings.todayDayA11y', { day: header }) : header;
  return loading
    ? t('fm.bookings.dayLoadingA11y', { day: dayPart })
    : t('fm.bookings.dayA11y', { day: dayPart, count });
}
