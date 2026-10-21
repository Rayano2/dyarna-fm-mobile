import type { FmTicket, TicketStatusFilter } from '../types';

/** Statuses after which the FM can no longer change the ticket. */
export const TERMINAL_STATUSES: ReadonlySet<string> = new Set([
  'RESOLVED',
  'CLOSED',
  'NOT_ACTIONABLE',
]);

/** Statuses where the FM is working the ticket and can resolve it. */
const ACTIONABLE_STATUSES: ReadonlySet<string> = new Set(['IN_PROGRESS', 'ASSIGNED', 'ESCALATED']);

/**
 * Statuses bms-tms accepts on `PATCH {n}/assign` (anything else is
 * `TMS_400_01`). The owner's rule (FM #110): the FM may assign or reassign
 * these whoever holds them now.
 */
const ASSIGNABLE_STATUSES: ReadonlySet<string> = new Set(['OPEN', 'IN_PROGRESS', 'ESCALATED']);

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

export type TicketActionKind = 'assign' | 'takeAction' | 'terminal' | 'none';

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
 * Which action bar a ticket gets (owner's rules, FM #110):
 * - OPEN, whoever holds it          -> assign (one-tap "Assign to me", or
 *                                      "Start progress" when it is already
 *                                      mine, plus the assignee picker)
 * - IN_PROGRESS/ASSIGNED/ESCALATED  -> takeAction (Resolved / Not actionable);
 *                                      `canAssign` adds Reassign
 * - RESOLVED/CLOSED/NOT_ACTIONABLE  -> terminal (read-only message)
 * - anything else                   -> none
 */
export function getTicketAction(ticket: Pick<FmTicket, 'statusCode'>): TicketActionKind {
  const status = ticket.statusCode.toUpperCase();
  if (TERMINAL_STATUSES.has(status)) return 'terminal';
  if (status === 'OPEN') return 'assign';
  if (ACTIONABLE_STATUSES.has(status)) return 'takeAction';
  return 'none';
}

/** Whether the assign / reassign picker is offered: OPEN, IN_PROGRESS, ESCALATED. */
export function canAssign(ticket: Pick<FmTicket, 'statusCode'>): boolean {
  return ASSIGNABLE_STATUSES.has(ticket.statusCode.toUpperCase());
}

/** The amber "assignment needed" notice: OPEN and nobody on it. */
export function needsAssignment(
  ticket: Pick<FmTicket, 'statusCode' | 'assignedTo' | 'assignedToId'>,
): boolean {
  return ticket.statusCode.toUpperCase() === 'OPEN' && isUnassigned(ticket);
}
