import { describe, expect, it } from 'vitest';
import { sanitizeOtpInput } from './otp-digits';

describe('sanitizeOtpInput (OtpBoxes filtering)', () => {
  it('keeps ASCII digits and caps at the length', () => {
    expect(sanitizeOtpInput('123456', 4)).toBe('1234');
  });

  it('converts Arabic-Indic digits instead of stripping them', () => {
    expect(sanitizeOtpInput('١٢٣٤', 4)).toBe('1234');
  });

  it('converts Persian (Extended Arabic-Indic) digits', () => {
    expect(sanitizeOtpInput('۵۶۷۸', 4)).toBe('5678');
  });

  it('handles mixed scripts and drops non-digits', () => {
    expect(sanitizeOtpInput(' 1-٢ ۳a4', 4)).toBe('1234');
    expect(sanitizeOtpInput('abc', 4)).toBe('');
  });
});
