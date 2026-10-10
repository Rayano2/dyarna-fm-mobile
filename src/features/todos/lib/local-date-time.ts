/**
 * BMS `TodoItem.dueDate` is a zone-less Java `LocalDateTime`: the server stores
 * whatever wall-clock time it is sent and echoes it back unchanged. So todos
 * travel as LOCAL wall-clock strings (`yyyy-MM-ddTHH:mm:ss`), never through
 * `toUtcIso` / `toISOString`, which would shift the due time by the offset.
 */

const LOCAL_DATE_TIME = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?$/;

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** `Date` -> `yyyy-MM-ddTHH:mm:ss` in the device's local time. */
export function formatLocalDateTime(date: Date): string {
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  );
}

/**
 * A zone-less `LocalDateTime` string -> a `Date` at that local wall-clock time.
 * Fractional seconds are dropped. Anything else (including a string WITH an
 * offset, which this endpoint never sends) yields undefined.
 */
export function parseLocalDateTime(value: string | null | undefined): Date | undefined {
  if (!value) return undefined;
  const m = LOCAL_DATE_TIME.exec(value);
  if (!m) return undefined;
  const part = (i: number): number => Number(m[i] ?? 0);
  const month = part(2) - 1;
  const day = part(3);
  const date = new Date(part(1), month, day, part(4), part(5), part(6));
  // Reject rolled-over values such as 2026-02-31.
  return date.getMonth() === month && date.getDate() === day ? date : undefined;
}

/** Normalises a server `LocalDateTime` to `yyyy-MM-ddTHH:mm:ss`, or null. */
export function normalizeLocalDateTime(value: unknown): string | null {
  const date = parseLocalDateTime(typeof value === 'string' ? value : undefined);
  return date ? formatLocalDateTime(date) : null;
}
