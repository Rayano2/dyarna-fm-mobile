import { describe, expect, it } from 'vitest';
import { canAssign, getTicketAction, needsAssignment } from './ticket-status';

const ME = 'user-me';
const OTHER = 'user-other';

function ticket(statusCode: string, assignedToId: string | null = null) {
  return { statusCode, assignedTo: null, assignedToId };
}

describe('getTicketAction (action-bar visibility)', () => {
  it('OPEN and unassigned -> assign', () => {
    expect(getTicketAction(ticket('OPEN'))).toBe('assign');
  });

  it('OPEN and assigned to someone else -> assign (owner rule, FM #110)', () => {
    // Was 'none' before: the FM could not take over a colleague's OPEN ticket.
    expect(getTicketAction(ticket('OPEN', OTHER))).toBe('assign');
    const nameOnly = { statusCode: 'OPEN', assignedTo: 'Ali', assignedToId: null };
    expect(getTicketAction(nameOnly)).toBe('assign');
  });

  it('OPEN and assigned to me -> assign (the bar offers Start progress)', () => {
    expect(getTicketAction(ticket('OPEN', ME))).toBe('assign');
  });

  it.each(['IN_PROGRESS', 'ASSIGNED', 'ESCALATED'])('%s -> Take action', (status) => {
    expect(getTicketAction(ticket(status, OTHER))).toBe('takeAction');
    expect(getTicketAction(ticket(status))).toBe('takeAction');
  });

  it.each(['RESOLVED', 'CLOSED', 'NOT_ACTIONABLE'])('%s -> read-only message', (status) => {
    expect(getTicketAction(ticket(status, ME))).toBe('terminal');
  });

  it('is case-insensitive and hides the bar for unknown statuses', () => {
    expect(getTicketAction(ticket('resolved'))).toBe('terminal');
    expect(getTicketAction(ticket('open', OTHER))).toBe('assign');
    expect(getTicketAction(ticket('SOMETHING_NEW'))).toBe('none');
  });
});

describe('canAssign (assign / reassign picker)', () => {
  it.each(['OPEN', 'IN_PROGRESS', 'ESCALATED', 'escalated'])('%s -> yes, whoever holds it', (s) => {
    expect(canAssign(ticket(s, OTHER))).toBe(true);
    expect(canAssign(ticket(s))).toBe(true);
  });

  it.each(['RESOLVED', 'CLOSED', 'NOT_ACTIONABLE', 'ASSIGNED', 'SOMETHING_NEW'])(
    '%s -> no (bms-tms answers TMS_400_01)',
    (s) => {
      expect(canAssign(ticket(s, ME))).toBe(false);
    },
  );
});

describe('needsAssignment (amber notice)', () => {
  it('only for OPEN and unassigned', () => {
    expect(needsAssignment(ticket('OPEN'))).toBe(true);
    expect(needsAssignment(ticket('OPEN', ME))).toBe(false);
    expect(needsAssignment(ticket('IN_PROGRESS'))).toBe(false);
  });
});
