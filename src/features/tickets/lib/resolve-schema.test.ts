import { describe, expect, it } from 'vitest';
import { parseRepairCost, resolveSchema } from './resolve-schema';

describe('parseRepairCost', () => {
  it('empty means no cost', () => {
    expect(parseRepairCost('')).toBeNull();
    expect(parseRepairCost('   ')).toBeNull();
  });

  it.each([
    ['0', 0],
    ['150', 150],
    ['150.5', 150.5],
    ['99.99', 99.99],
    ['100000', 100_000],
    ['100000.00', 100_000],
    [' 12.3 ', 12.3],
  ])('accepts %j', (input, expected) => {
    expect(parseRepairCost(input)).toBe(expected);
  });

  it('accepts Arabic-Indic digits and a comma separator', () => {
    expect(parseRepairCost('١٢٥')).toBe(125);
    expect(parseRepairCost('۱۲,۵')).toBe(12.5);
    expect(parseRepairCost('12,75')).toBe(12.75);
  });

  it.each(['-1', '100000.01', '100001', '1.234', 'abc', '1e3', '.5', '5.', '1 000', 'NaN'])(
    'rejects %j',
    (input) => {
      expect(parseRepairCost(input)).toBeUndefined();
    },
  );
});

describe('resolveSchema', () => {
  const base = { comment: 'Replaced the breaker', repairCost: '', files: [] };

  it('requires a non-blank comment', () => {
    const r = resolveSchema.safeParse({ ...base, comment: '   ' });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.message).toBe('commentRequired');
  });

  it('flags an invalid repair cost', () => {
    const r = resolveSchema.safeParse({ ...base, repairCost: '100000.5' });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.path).toEqual(['repairCost']);
    expect(r.error?.issues[0]?.message).toBe('costInvalid');
  });

  it('caps attachments at 5', () => {
    const img = { uri: 'file://a', fileName: 'a.jpg', mimeType: 'image/jpeg' };
    expect(
      resolveSchema.safeParse({ ...base, files: Array.from({ length: 5 }, () => img) }).success,
    ).toBe(true);
    expect(
      resolveSchema.safeParse({ ...base, files: Array.from({ length: 6 }, () => img) }).success,
    ).toBe(false);
  });

  it('passes a valid form', () => {
    expect(resolveSchema.safeParse({ ...base, repairCost: '250.75' }).success).toBe(true);
  });
});
