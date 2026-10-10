/** Trailing `Z`, `+03:00`, or `+0300`. */
const HAS_OFFSET = /(?:Z|[+-]\d{2}:?\d{2})$/i;

/**
 * `NotificationResponse.createdAt` is a Java `LocalDateTime`, which Jackson
 * serialises with NO zone/offset (`2026-08-21T09:15:00`). JS parses an
 * offsetless ISO string as DEVICE-LOCAL, so a UTC-stored instant read on a
 * UTC+3 phone lands 3 hours in the future and `formatRelativeTime` renders
 * nonsense ("in 3 hours" territory).
 *
 * Normalising here — at the boundary — keeps the fix in one place and leaves
 * `format-relative-time.ts` (shared with tickets, posts, dashboards) alone.
 *
 * Values that already carry an offset pass through untouched, so this stays
 * correct if the backend is later migrated to `Instant`/`OffsetDateTime`.
 * Date-only values are also passed through: appending `Z` to `2026-08-21`
 * would produce a string `Date` cannot parse.
 */
export function toUtcIso(raw: string | undefined): string | undefined {
  if (raw === undefined) return undefined;
  const trimmed = raw.trim();
  if (trimmed.length === 0) return undefined;
  if (!trimmed.includes('T')) return trimmed;
  if (HAS_OFFSET.test(trimmed)) return trimmed;
  return `${trimmed}Z`;
}
