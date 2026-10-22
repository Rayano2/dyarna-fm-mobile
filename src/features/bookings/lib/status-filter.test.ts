import { describe, expect, it } from 'vitest';
import {
  DEFAULT_STATUS_FILTER,
  STATUS_FILTERS,
  isStatusFilter,
  showsStatusNotice,
} from './status-filter';

describe('bookings status filter', () => {
  it('defaults to All (no status filter)', () => {
    expect(DEFAULT_STATUS_FILTER).toBe('ALL');
  });

  it('puts All as the first chip, then every status once', () => {
    expect(STATUS_FILTERS[0]).toBe('ALL');
    expect(STATUS_FILTERS).toEqual([
      'ALL',
      'PENDING',
      'APPROVED',
      'REJECTED',
      'CANCELLED',
      'COMPLETED',
      'NO_SHOW',
    ]);
  });

  it('hides the "Showing X only" notice by default and shows it for a specific status', () => {
    expect(showsStatusNotice(DEFAULT_STATUS_FILTER)).toBe(false);
    expect(showsStatusNotice('PENDING')).toBe(true);
    expect(showsStatusNotice('APPROVED')).toBe(true);
  });

  it('accepts the Facilities deep-link statuses and rejects junk', () => {
    expect(isStatusFilter('APPROVED')).toBe(true);
    expect(isStatusFilter('ALL')).toBe(true);
    expect(isStatusFilter('approved')).toBe(false);
    expect(isStatusFilter(null)).toBe(false);
  });
});
