import type { Booking } from '../api/bookings-api';
import { dayKey, startOfLocalDay } from './booking-dates';

export interface AgendaSection {
  /** Local `yyyy-MM-dd`, or '' for bookings with no start time. */
  key: string;
  date: Date | undefined;
  data: Booking[];
}

/** Within a day: PENDING first (they need a decision), then by start time. */
export function compareWithinDay(a: Booking, b: Booking): number {
  const pa = a.status === 'PENDING' ? 0 : 1;
  const pb = b.status === 'PENDING' ? 0 : 1;
  if (pa !== pb) return pa - pb;
  const ta = a.startTime?.getTime() ?? Number.POSITIVE_INFINITY;
  const tb = b.startTime?.getTime() ?? Number.POSITIVE_INFINITY;
  if (ta !== tb) return ta - tb;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/**
 * Groups bookings by LOCAL start day, days ascending (soonest first, like the
 * server). Bookings with no start time go to a trailing '' section.
 */
export function groupAgenda(bookings: readonly Booking[]): AgendaSection[] {
  const byDay = new Map<string, AgendaSection>();
  for (const booking of bookings) {
    const key = booking.startTime ? dayKey(booking.startTime) : '';
    let section = byDay.get(key);
    if (!section) {
      section = {
        key,
        date: booking.startTime ? startOfLocalDay(booking.startTime) : undefined,
        data: [],
      };
      byDay.set(key, section);
    }
    section.data.push(booking);
  }
  const sections = [...byDay.values()];
  for (const s of sections) s.data.sort(compareWithinDay);
  // eslint-disable-next-line unicorn/no-array-sort -- toSorted() isn't on iOS/JSC pre-Safari 16; the array is local
  return sections.sort((a, b) => {
    if (a.key === '') return 1;
    if (b.key === '') return -1;
    return a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
  });
}

/** Booking count per local day, for the week strip's dots. */
export function countByDay(bookings: readonly Booking[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const b of bookings) {
    if (!b.startTime) continue;
    const key = dayKey(b.startTime);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}
