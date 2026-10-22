import { describe, expect, it } from 'vitest';
import {
  assigneeDisplayName,
  canAssign,
  getActionButtons,
  getTicketAction,
  needsAssignment,
  needsTakeOverConfirm,
} from './ticket-status';

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

  it.each(['ASSIGNED', 'IN_PROGRESS', 'ESCALATED'])('%s -> Take action', (status) => {
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

  it.each(['RESOLVED', 'CLOSED', 'NOT_ACTIONABLE', 'SOMETHING_NEW'])(
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

describe('getActionButtons (FM web flow, FM #110 retest)', () => {
  // The signature takes no assignable-users input: on 99d8b02 the primary
  // "Assign to me" only showed once that list loaded and listed me, so it
  // vanished when the list was undefined (loading) or errored (old bms-tms).
  it('OPEN and unassigned -> Assign to me, with no assignable-users list at all', () => {
    expect(getActionButtons(ticket('OPEN'), ME)).toEqual({
      primary: 'assignToMe',
      secondary: 'assignToSomeoneElse',
    });
  });

  it('OPEN and assigned to me -> Start progress, Reassign as secondary', () => {
    expect(getActionButtons(ticket('OPEN', ME), ME)).toEqual({
      primary: 'startProgress',
      secondary: 'reassign',
    });
  });

  it('OPEN and assigned to someone else -> Assign to me (take over), Reassign as secondary', () => {
    expect(getActionButtons(ticket('OPEN', OTHER), ME)).toEqual({
      primary: 'assignToMe',
      secondary: 'reassign',
    });
    const nameOnly = { statusCode: 'OPEN', assignedTo: 'Ali', assignedToId: null };
    expect(getActionButtons(nameOnly, ME).primary).toBe('assignToMe');
  });

  describe.each(['IN_PROGRESS', 'ESCALATED'])('%s', (status) => {
    it.each([
      ['unassigned', null],
      ['assigned to me', ME],
      ['assigned to someone else', OTHER],
    ])('%s -> Take action + Reassign (no assignee check)', (_label, assignee) => {
      expect(getActionButtons(ticket(status, assignee), ME)).toEqual({
        primary: 'takeAction',
        secondary: 'reassign',
      });
    });
  });

  it('ASSIGNED -> Take action; no picker, bms-tms does not accept assign there', () => {
    expect(getActionButtons(ticket('ASSIGNED', OTHER), ME)).toEqual({
      primary: 'takeAction',
      secondary: null,
    });
  });

  it.each(['RESOLVED', 'CLOSED', 'NOT_ACTIONABLE', 'SOMETHING_NEW'])('%s -> no buttons', (s) => {
    expect(getActionButtons(ticket(s, ME), ME)).toEqual({ primary: null, secondary: null });
  });
});

describe('needsTakeOverConfirm (W6)', () => {
  it('asks before taking an OPEN ticket someone else holds', () => {
    expect(needsTakeOverConfirm(ticket('OPEN', OTHER), ME)).toBe(true);
    expect(
      needsTakeOverConfirm({ statusCode: 'OPEN', assignedTo: 'Ali', assignedToId: null }, ME),
    ).toBe(true);
  });

  it('keeps one-tap assign for unassigned, and never asks when mine or not OPEN', () => {
    expect(needsTakeOverConfirm(ticket('OPEN'), ME)).toBe(false);
    expect(needsTakeOverConfirm(ticket('OPEN', ME), ME)).toBe(false);
    expect(needsTakeOverConfirm(ticket('IN_PROGRESS', OTHER), ME)).toBe(false);
    expect(needsTakeOverConfirm(ticket('RESOLVED', OTHER), ME)).toBe(false);
  });
});

describe('assigneeDisplayName', () => {
  it('is the name when the server sends one', () => {
    expect(assigneeDisplayName({ assignedTo: 'Ali Hassan', assignedToId: OTHER })).toBe(
      'Ali Hassan',
    );
  });

  it('is null (fallback copy) for an id-only, blank or missing assignee', () => {
    expect(assigneeDisplayName({ assignedTo: OTHER, assignedToId: OTHER })).toBeNull();
    expect(assigneeDisplayName({ assignedTo: '  ', assignedToId: OTHER })).toBeNull();
    expect(assigneeDisplayName({ assignedTo: null, assignedToId: OTHER })).toBeNull();
  });
});
