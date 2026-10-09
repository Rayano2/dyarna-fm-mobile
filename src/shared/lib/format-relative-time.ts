type Translator = (key: string) => string;

/**
 * Format a date string as a relative time using existing `tickets.time.*` i18n
 * keys. Mirrors the inline helper TicketCard / PostCard each carry — extract
 * here so dashboard widgets can stay consistent without duplicating the logic.
 */
export function formatRelativeTime(dateString: string | undefined | null, t: Translator): string {
  if (!dateString) return '';
  const then = new Date(dateString).getTime();
  if (Number.isNaN(then)) return '';
  const diffMs = Date.now() - then;
  const diffMin = Math.round(diffMs / 60_000);
  if (diffMin < 1) return t('tickets.time.justNow');
  if (diffMin < 60) return t('tickets.time.minutesAgo').replace('{{n}}', String(diffMin));
  const diffHrs = Math.round(diffMin / 60);
  if (diffHrs < 24) return t('tickets.time.hoursAgo').replace('{{n}}', String(diffHrs));
  const diffDays = Math.round(diffHrs / 24);
  if (diffDays < 7) return t('tickets.time.daysAgo').replace('{{n}}', String(diffDays));
  const diffWeeks = Math.round(diffDays / 7);
  if (diffWeeks < 4) return t('tickets.time.weeksAgo').replace('{{n}}', String(diffWeeks));
  // Use 30-day months and 365-day years rather than calendar months so the
  // helper stays cheap and self-contained. The fuzziness is fine — we're
  // already rounding hours and weeks the same way.
  const diffMonths = Math.round(diffDays / 30);
  if (diffMonths < 12) return t('tickets.time.monthsAgo').replace('{{n}}', String(diffMonths));
  const diffYears = Math.round(diffDays / 365);
  return t('tickets.time.yearsAgo').replace('{{n}}', String(diffYears));
}
