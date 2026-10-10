/**
 * Arabic keyboards type Arabic-Indic (U+0660..U+0669) or Extended
 * Arabic-Indic / Persian (U+06F0..U+06F9) digits. Map both to ASCII so
 * numeric validation and the values sent to the API see `0-9`.
 */
export function toAsciiDigits(input: string): string {
  return input
    .replaceAll(/[٠-٩]/g, (d) => String(d.codePointAt(0)! - 1632))
    .replaceAll(/[۰-۹]/g, (d) => String(d.codePointAt(0)! - 1776));
}
