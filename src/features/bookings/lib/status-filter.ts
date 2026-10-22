import { BOOKING_STATUSES, type BookingStatus } from '../api/bookings-api';

export type StatusFilter = BookingStatus | 'ALL';

/**
 * Bookings open unfiltered (owner, FM #110). This was PENDING before. Only the
 * screen's own state and the Facilities deep link (`?status=`) set it; nothing
 * is persisted, so no stale PENDING can carry over.
 */
export const DEFAULT_STATUS_FILTER: StatusFilter = 'ALL';

/** Chip order: "All" first, then the bms statuses (same order in EN and AR). */
export const STATUS_FILTERS: readonly StatusFilter[] = ['ALL', ...BOOKING_STATUSES];

export function isStatusFilter(value: unknown): value is StatusFilter {
  return typeof value === 'string' && (STATUS_FILTERS as readonly string[]).includes(value);
}

/** The "Showing X only / Show all" notice: only while a specific status is picked. */
export function showsStatusNotice(status: StatusFilter): boolean {
  return status !== 'ALL';
}
