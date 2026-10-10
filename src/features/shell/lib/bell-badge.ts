/** Bell badge text: null hides the badge (no count, zero, or nonsense), and
 *  anything over 99 is capped at "99+" so the pill never outgrows the bell. */
export function formatBellBadge(count?: number): string | null {
  if (typeof count !== 'number' || !Number.isFinite(count)) return null;
  const whole = Math.trunc(count);
  if (whole <= 0) return null;
  return whole > 99 ? '99+' : String(whole);
}
