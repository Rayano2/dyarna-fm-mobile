import type { FmTicket, TicketStatusFilter } from '../types';

/** Statuses after which the FM can no longer change the ticket. */
export const TERMINAL_STATUSES: ReadonlySet<string> = new Set([
  'RESOLVED',
  'CLOSED',
  'NOT_ACTIONABLE',
]);

/** Statuses where the FM is working the ticket and can resolve it. */
const ACTIONABLE_STATUSES: ReadonlySet<string> = new Set(['IN_PROGRESS', 'ASSIGNED', 'ESCALATED']);

/** The web's status set plus NOT_ACTIONABLE and ESCALATED, in filter order. */
export const STATUS_FILTERS: readonly TicketStatusFilter[] = [
  'ALL',
  'OPEN',
  'ASSIGNED',
  'IN_PROGRESS',
  'RESOLVED',
  'CLOSED',
  'NOT_ACTIONABLE',
  'ESCALATED',
];

export const PRIORITY_CODES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;

export type TicketActionKind = 'assign' | 'start' | 'takeAction' | 'terminal' | 'none';

export function isTerminalStatus(statusCode: string): boolean {
  return TERMINAL_STATUSES.has(statusCode.toUpperCase());
}

export function isUnassigned(ticket: Pick<FmTicket, 'assignedTo' | 'assignedToId'>): boolean {
  return !ticket.assignedToId && !ticket.assignedTo;
}

export function isAssignedTo(
  ticket: Pick<FmTicket, 'assignedTo' | 'assignedToId'>,
  userId: string | null,
): boolean {
  if (!userId) return false;
  return ticket.assignedToId === userId || ticket.assignedTo === userId;
}

/**
 * Which action bar a ticket gets (the web's rules):
 * - OPEN, unassigned            -> assign ("Assign to me")
 * - OPEN, assigned to me        -> start ("Start progress")
 * - OPEN, assigned to another   -> none (no bar)
 * - IN_PROGRESS/ASSIGNED/ESCALATED -> takeAction (Resolved / Not actionable)
 * - RESOLVED/CLOSED/NOT_ACTIONABLE -> terminal (read-only message)
 * - anything else               -> none
 */
export function getTicketAction(
  ticket: Pick<FmTicket, 'statusCode' | 'assignedTo' | 'assignedToId'>,
  userId: string | null,
): TicketActionKind {
  const status = ticket.statusCode.toUpperCase();
  if (TERMINAL_STATUSES.has(status)) return 'terminal';
  if (ACTIONABLE_STATUSES.has(status)) return 'takeAction';
  if (status === 'OPEN') {
    if (isUnassigned(ticket)) return 'assign';
    return isAssignedTo(ticket, userId) ? 'start' : 'none';
  }
  return 'none';
}

/** The amber "assignment needed" notice: OPEN and nobody on it. */
export function needsAssignment(
  ticket: Pick<FmTicket, 'statusCode' | 'assignedTo' | 'assignedToId'>,
): boolean {
  return ticket.statusCode.toUpperCase() === 'OPEN' && isUnassigned(ticket);
}
