import { describe, expect, it } from 'vitest';
import { getTicketAction, needsAssignment } from './ticket-status';

const ME = 'user-me';
const OTHER = 'user-other';

function ticket(statusCode: string, assignedToId: string | null = null) {
  return { statusCode, assignedTo: null, assignedToId };
}

describe('getTicketAction (action-bar visibility)', () => {
  it('OPEN and unassigned -> Assign to me', () => {
    expect(getTicketAction(ticket('OPEN'), ME)).toBe('assign');
  });

  it('OPEN and assigned to me -> Start progress', () => {
    expect(getTicketAction(ticket('OPEN', ME), ME)).toBe('start');
  });

  it('OPEN and assigned to someone else -> no bar', () => {
    expect(getTicketAction(ticket('OPEN', OTHER), ME)).toBe('none');
  });

  it('OPEN with only an assignee name (no id) counts as assigned, not mine', () => {
    expect(getTicketAction({ statusCode: 'OPEN', assignedTo: 'Ali', assignedToId: null }, ME)).toBe(
      'none',
    );
  });

  it.each(['IN_PROGRESS', 'ASSIGNED', 'ESCALATED'])('%s -> Take action', (status) => {
    expect(getTicketAction(ticket(status, OTHER), ME)).toBe('takeAction');
    expect(getTicketAction(ticket(status), ME)).toBe('takeAction');
  });

  it.each(['RESOLVED', 'CLOSED', 'NOT_ACTIONABLE'])('%s -> read-only message', (status) => {
    expect(getTicketAction(ticket(status, ME), ME)).toBe('terminal');
  });

  it('is case-insensitive and hides the bar for unknown statuses', () => {
    expect(getTicketAction(ticket('resolved'), ME)).toBe('terminal');
    expect(getTicketAction(ticket('SOMETHING_NEW'), ME)).toBe('none');
  });

  it('without a signed-in user id an assigned OPEN ticket gets no bar', () => {
    expect(getTicketAction(ticket('OPEN', ME), null)).toBe('none');
  });
});

describe('needsAssignment (amber notice)', () => {
  it('only for OPEN and unassigned', () => {
    expect(needsAssignment(ticket('OPEN'))).toBe(true);
    expect(needsAssignment(ticket('OPEN', ME))).toBe(false);
    expect(needsAssignment(ticket('IN_PROGRESS'))).toBe(false);
  });
});
