import type { TFunction } from 'i18next';
import { describe, expect, it } from 'vitest';
import ar from '@/shared/i18n/translations/ar.json';
import en from '@/shared/i18n/translations/en.json';
import { formatMonthDay } from './format-booking-time';
import { dayA11yLabel, formatDayCount, formatWeekRange, weekdayShortKey } from './week-strip';

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

describe('formatMonthDay in Arabic (W1)', () => {
  it('uses Latin digits and the Gregorian month, matching the cells', () => {
    const text = formatMonthDay(new Date(2025, 9, 18), 'ar');
    expect(text).toContain('18');
    expect(text).toContain('أكتوبر');
    // No Arabic-Indic (U+0660-0669) or extended (U+06F0-06F9) digits.
    expect(text).not.toMatch(/[٠-٩۰-۹]/);
  });
});

// Interpolating fake t: resolves the EN/AR template and fills its params.
function makeT(dict: unknown): TFunction {
  return ((key: string, opts: Record<string, unknown>) => {
    const count = typeof opts.count === 'number' ? opts.count : undefined;
    const template =
      (count === undefined ? undefined : lookup(dict, `${key}_${count === 1 ? 'one' : 'other'}`)) ??
      lookup(dict, key);
    return String(template).replaceAll(/{{(\w+)}}/g, (_m, name: string) => String(opts[name]));
  }) as unknown as TFunction;
}

describe('dayA11yLabel (W5)', () => {
  const day = new Date(2025, 9, 21);

  it('is the day and count on an ordinary day', () => {
    const label = dayA11yLabel(day, 'en', { count: 3, isToday: false, loading: false }, makeT(en));
    expect(label).toBe('Tue, Oct 21, 3 bookings');
  });

  it('puts "today" inside the day part, from one key per locale', () => {
    expect(dayA11yLabel(day, 'en', { count: 1, isToday: true, loading: false }, makeT(en))).toBe(
      'Tue, Oct 21, today, 1 booking',
    );
    const arLabel = dayA11yLabel(day, 'ar', { count: 1, isToday: true, loading: false }, makeT(ar));
    expect(arLabel).toContain('، اليوم');
    expect(arLabel).not.toContain(', ');
  });

  it('announces loading instead of a count while the week loads', () => {
    expect(dayA11yLabel(day, 'en', { count: 0, isToday: false, loading: true }, makeT(en))).toBe(
      'Tue, Oct 21, loading',
    );
    expect(dayA11yLabel(day, 'en', { count: 0, isToday: true, loading: true }, makeT(en))).toBe(
      'Tue, Oct 21, today, loading',
    );
  });

  it('has both keys in both locales', () => {
    for (const dict of [en, ar]) {
      expect(lookup(dict, 'fm.bookings.todayDayA11y')).toContain('{{day}}');
      expect(lookup(dict, 'fm.bookings.dayLoadingA11y')).toContain('{{day}}');
    }
  });
});
