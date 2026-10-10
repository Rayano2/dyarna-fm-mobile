import { describe, expect, it } from 'vitest';
import { toAsciiDigits } from './to-ascii-digits';

describe('toAsciiDigits', () => {
  it('maps Arabic-Indic digits', () => {
    expect(toAsciiDigits('٠١٢٣٤٥٦٧٨٩')).toBe('0123456789');
  });

  it('maps Extended Arabic-Indic (Persian) digits', () => {
    expect(toAsciiDigits('۰۱۲۳۴۵۶۷۸۹')).toBe('0123456789');
  });

  it('leaves ASCII digits and other characters alone', () => {
    expect(toAsciiDigits('A-12 ب')).toBe('A-12 ب');
    expect(toAsciiDigits('A-١٢')).toBe('A-12');
  });
});
