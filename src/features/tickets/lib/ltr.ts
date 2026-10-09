/** Left-to-right mark. */
const LRM = '‎';

/**
 * Forces a code-like string (ticket number, phone, countdown) to lay out LTR
 * inside RTL text. A leading LRM makes the paragraph direction LTR, so
 * `#EL-000001` never renders as `EL-000001#` in Arabic.
 */
export function ltr(value: string): string {
  return value ? `${LRM}${value}` : value;
}
