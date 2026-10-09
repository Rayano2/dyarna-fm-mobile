/**
 * Date helpers for the bookings filters, agenda and week strip.
 *
 * Everything here works on the device's LOCAL calendar. The only wire formats
 * are `fromParam` / `toParam`: Community declares `from`/`to` as `Instant`, and
 * a bare `yyyy-MM-dd` throws a type mismatch that surfaces as a 500.
 *
 * Both bounds are LOCAL midnights serialized as instants. UTC midnight (what
 * the web sends) loses 00:00–02:59 of the picked day in Riyadh (UTC+3).
 */

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** Local calendar date as `yyyy-MM-dd`. Also the agenda/week grouping key. */
export function dayKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

/** `from` (inclusive on the server): local midnight starting the picked day. */
export function fromParam(date: Date): string {
  return startOfLocalDay(date).toISOString();
}

/**
 * `to` (EXCLUSIVE on the server): local midnight ending the picked day, so
 * "to 14 Oct" includes all of the 14th.
 */
export function toParam(date: Date): string {
  return addDays(startOfLocalDay(date), 1).toISOString();
}

/**
 * First day of the week for the UI locale (0 = Sunday … 6 = Saturday), from
 * `Intl.Locale#getWeekInfo` where the runtime has it. Hermes builds without
 * full ICU lack it, so fall back to Sunday — the first day for both locale
 * tags the app formats with (`en-US`, `ar-SA`).
 */
export function weekStartDay(locale: 'en' | 'ar'): number {
  try {
    const tag = locale === 'ar' ? 'ar-SA' : 'en-US';
    const loc = new Intl.Locale(tag) as Intl.Locale & {
      getWeekInfo?: () => { firstDay: number };
      weekInfo?: { firstDay: number };
    };
    const info = loc.getWeekInfo?.() ?? loc.weekInfo;
    // ISO numbering: 1 = Monday … 7 = Sunday.
    if (info && typeof info.firstDay === 'number') return info.firstDay % 7;
  } catch {
    // fall through
  }
  return 0;
}

export function startOfWeek(date: Date, firstDay: number): Date {
  const d = startOfLocalDay(date);
  const diff = (d.getDay() - firstDay + 7) % 7;
  return addDays(d, -diff);
}

/** The 7 local days of the week containing `anchor`, in locale order. */
export function weekDays(anchor: Date, firstDay: number): Date[] {
  const start = startOfWeek(anchor, firstDay);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/**
 * The fetch window for a week: local midnight of its first day up to (not
 * including) local midnight after its last. Local bounds need no padding.
 */
export function weekFetchRange(anchor: Date, firstDay: number): { from: string; to: string } {
  const start = startOfWeek(anchor, firstDay);
  return { from: fromParam(start), to: toParam(addDays(start, 6)) };
}

/** Exact duration in whole minutes, or undefined for a missing/inverted range. */
export function durationMinutes(
  start: Date | undefined,
  end: Date | undefined,
): number | undefined {
  if (!start || !end) return undefined;
  const minutes = Math.round((end.getTime() - start.getTime()) / 60_000);
  return Number.isFinite(minutes) && minutes > 0 ? minutes : undefined;
}
