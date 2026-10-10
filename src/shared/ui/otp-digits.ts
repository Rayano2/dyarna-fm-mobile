import { toAsciiDigits } from '@/shared/lib/to-ascii-digits';

/**
 * What OtpBoxes keeps from typed or pasted text: Arabic-Indic and Persian
 * digits are converted to ASCII (not stripped), everything else that is not a
 * digit is dropped, and the result is capped at `length`.
 */
export function sanitizeOtpInput(text: string, length: number): string {
  return toAsciiDigits(text).replaceAll(/\D/g, '').slice(0, length);
}
