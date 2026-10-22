import type { TFunction } from 'i18next';
import { describe, expect, it } from 'vitest';
import ar from '@/shared/i18n/translations/ar.json';
import en from '@/shared/i18n/translations/en.json';
import { formatDayCount, formatWeekRange, weekdayShortKey } from './week-strip';

// Sun 19 Oct 2025 .. Sat 25 Oct 2025, local time.
const WEEK = Array.from({ length: 7 }, (_, i) => new Date(2025, 9, 19 + i));

function lookup(dict: unknown, key: string): unknown {
  let node = dict;
  for (const part of key.split('.')) {
    node = node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined;
  }
  return node;
}

describe('weekday short map', () => {
  it('keys each day by Date.getDay (0 = Sunday)', () => {
    expect(WEEK.map((d) => weekdayShortKey(d))).toEqual(
      [0, 1, 2, 3, 4, 5, 6].map((d) => `fm.bookings.weekdayShort.${d}`),
    );
  });

  it('has the agreed two-letter labels in EN and AR, all seven on both sides', () => {
    expect(WEEK.map((d) => lookup(en, weekdayShortKey(d)))).toEqual([
      'Su',
      'Mo',
      'Tu',
      'We',
      'Th',
      'Fr',
      'Sa',
    ]);
    expect(WEEK.map((d) => lookup(ar, weekdayShortKey(d)))).toEqual([
      'أح',
      'إث',
      'ثل',
      'أر',
      'خم',
      'جم',
      'سب',
    ]);
  });
});

describe('formatWeekRange', () => {
  const t = ((key: string, opts: { from: string; to: string }) =>
    `${key}|${opts.from}|${opts.to}`) as unknown as TFunction;

  it('uses the first and last day through fm.bookings.weekRange', () => {
    expect(formatWeekRange(WEEK, 'en', t)).toBe('fm.bookings.weekRange|Oct 19|Oct 25');
  });

  it('follows the strip order, whatever the week start', () => {
    const fromMonday = [...WEEK.slice(1), new Date(2025, 9, 26)];
    expect(formatWeekRange(fromMonday, 'en', t)).toBe('fm.bookings.weekRange|Oct 20|Oct 26');
  });

  it('is empty for no days', () => {
    expect(formatWeekRange([], 'en', t)).toBe('');
  });

  it('has the range template in both locales', () => {
    expect(lookup(en, 'fm.bookings.weekRange')).toBe('{{from}} – {{to}}');
    expect(lookup(ar, 'fm.bookings.weekRange')).toBe('{{from}} – {{to}}');
  });
});

describe('formatDayCount', () => {
  it.each([
    [1, '1'],
    [9, '9'],
    [99, '99'],
    [100, '99+'],
    [250, '99+'],
  ])('%i -> %s', (count, text) => {
    expect(formatDayCount(count)).toBe(text);
  });
});
