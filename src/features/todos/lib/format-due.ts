import { safeToLocaleDateString, safeToLocaleString } from '@/shared/lib/safe-intl';

/** Display formatting for due dates, in LOCAL time (the value is zone-less). */

function tag(locale: 'en' | 'ar'): string {
  return locale === 'ar' ? 'ar-SA' : 'en-US';
}

/** Row badge, e.g. "Oct 14". */
export function formatDueShort(date: Date, locale: 'en' | 'ar'): string {
  return safeToLocaleDateString(date, tag(locale), { month: 'short', day: 'numeric' });
}

/** Form row value, e.g. "Oct 14, 2026, 3:00 PM". */
export function formatDueLong(date: Date, locale: 'en' | 'ar'): string {
  return safeToLocaleString(date, tag(locale), {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
