import type { FmTicket, TicketStatusFilter } from '../types';

/** Statuses after which the FM can no longer change the ticket. */
export const TERMINAL_STATUSES: ReadonlySet<string> = new Set([
  'RESOLVED',
  'CLOSED',
  'NOT_ACTIONABLE',
]);

/**
 * Statuses where the FM is working the ticket and can resolve it. ASSIGNED is
 * not a bms-tms status today; it is listed for parity with the web
 * (`tickets.tsx` canTakeAction), which has no assignee check either.
 */
const ACTIONABLE_STATUSES: ReadonlySet<string> = new Set(['ASSIGNED', 'IN_PROGRESS', 'ESCALATED']);

/**
 * Statuses bms-tms accepts on `PATCH {n}/assign` (anything else is
 * `TMS_400_01`). The owner's rule (FM #110): the FM may assign or reassign
 * these whoever holds them now.
 */
const ASSIGNABLE_STATUSES: ReadonlySet<string> = new Set(['OPEN', 'IN_PROGRESS', 'ESCALATED']);

/** bms-tms ticket statuses, in filter order. There is no ASSIGNED status in BMS. */
export const STATUS_FILTERS: readonly TicketStatusFilter[] = [
  'ALL',
  'OPEN',
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
 * - ASSIGNED/IN_PROGRESS/ESCALATED  -> takeAction (Resolved / Not actionable);
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

export type PrimaryTicketAction = 'assignToMe' | 'startProgress' | 'takeAction';
export type SecondaryTicketAction = 'assignToSomeoneElse' | 'reassign';

export interface TicketActionButtons {
  primary: PrimaryTicketAction | null;
  secondary: SecondaryTicketAction | null;
}

/**
 * The action bar's buttons, matching the FM web flow (FM #110 retest: "the FM
 * selects assign to me, then works on it"). Depends on the ticket and the
 * signed-in user only — never on the assignable-users list, which the picker
 * fetches on open and which old bms-tms builds do not serve.
 * - OPEN, mine                  -> Start progress
 * - OPEN, unassigned or other's -> Assign to me (taking it over)
 * - ASSIGNED/IN_PROGRESS/ESCALATED -> Take action, no assignee check (web parity)
 * - secondary: the picker, where `canAssign` allows it
 */
export function getActionButtons(
  ticket: Pick<FmTicket, 'statusCode' | 'assignedTo' | 'assignedToId'>,
  myId: string | null,
): TicketActionButtons {
  const action = getTicketAction(ticket);
  const picker = canAssign(ticket);
  if (action === 'assign') {
    return {
      primary: isAssignedTo(ticket, myId) ? 'startProgress' : 'assignToMe',
      secondary: picker ? (isUnassigned(ticket) ? 'assignToSomeoneElse' : 'reassign') : null,
    };
  }
  if (action === 'takeAction') {
    return { primary: 'takeAction', secondary: picker ? 'reassign' : null };
  }
  return { primary: null, secondary: null };
}
