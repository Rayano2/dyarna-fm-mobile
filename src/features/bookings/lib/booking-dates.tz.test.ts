import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { fromParam, toParam, weekFetchRange } from './booking-dates';

// Riyadh is UTC+3 with no DST. Node re-reads TZ when it changes, so every Date
// built inside these tests is local to Riyadh.
const original = process.env.TZ;
beforeAll(() => {
  process.env.TZ = 'Asia/Riyadh';
});
afterAll(() => {
  process.env.TZ = original;
});

describe('booking range in UTC+3 (Asia/Riyadh)', () => {
  it('runs in the UTC+3 offset', () => {
    expect(new Date(2026, 9, 14).getTimezoneOffset()).toBe(-180);
  });

  it('starts "from 14 Oct" at 00:00 Riyadh, i.e. 21:00Z the day before', () => {
    expect(fromParam(new Date(2026, 9, 14, 15))).toBe('2026-10-13T21:00:00.000Z');
  });

  it('ends "to 14 Oct" at 00:00 Riyadh on the 15th, so the whole 14th is included', () => {
    expect(toParam(new Date(2026, 9, 14))).toBe('2026-10-14T21:00:00.000Z');
  });

  it('includes a 01:30 Riyadh booking that UTC-midnight bounds would drop', () => {
    const booking = new Date(2026, 9, 14, 1, 30); // 22:30Z on the 13th
    const from = new Date(fromParam(new Date(2026, 9, 14)));
    const to = new Date(toParam(new Date(2026, 9, 14)));
    expect(booking >= from && booking < to).toBe(true);
    // The old bound, `2026-10-14T00:00:00.000Z`, started after this booking.
    expect(booking < new Date('2026-10-14T00:00:00.000Z')).toBe(true);
  });

  it('bounds the week on Riyadh midnights', () => {
    expect(weekFetchRange(new Date(2026, 9, 14), 0)).toEqual({
      from: '2026-10-10T21:00:00.000Z',
      to: '2026-10-17T21:00:00.000Z',
    });
  });
});
