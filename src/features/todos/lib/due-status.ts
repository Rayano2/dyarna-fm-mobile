import { parseLocalDateTime } from './local-date-time';

/**
 * Port of the web `getDueDateStatus` (client/src/pages/todos.tsx), computed on
 * LOCAL calendar days because `dueDate` is a zone-less local wall-clock time.
 *
 * - overdue: in the past and not today (earlier today still counts as today)
 * - today / tomorrow: on that local calendar day
 * - soon: within 48 hours
 * - normal: later
 * - null: no (or an unparsable) due date
 */
export type DueStatus = 'overdue' | 'today' | 'tomorrow' | 'soon' | 'normal';

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function getDueStatus(dueDate: string | null, now: Date = new Date()): DueStatus | null {
  const due = parseLocalDateTime(dueDate);
  if (!due) return null;
  if (sameDay(due, now)) return 'today';
  if (due.getTime() < now.getTime()) return 'overdue';
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  if (sameDay(due, tomorrow)) return 'tomorrow';
  const hoursUntilDue = (due.getTime() - now.getTime()) / 3_600_000;
  return hoursUntilDue <= 48 ? 'soon' : 'normal';
}
