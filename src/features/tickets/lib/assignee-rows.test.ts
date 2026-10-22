import { describe, expect, it } from 'vitest';
import type { AssignableUser } from '../api/get-assignable-users';
import { buildAssigneeRows } from './assignee-rows';

const user = (userId: string, over: Partial<AssignableUser> = {}): AssignableUser => ({
  userId,
  fullName: `Name ${userId}`,
  role: 'COMPANY_REP',
  isCurrentAssignee: false,
  ...over,
});

describe('buildAssigneeRows', () => {
  it('pins Me first when the server lists me, the rest in server order', () => {
    const rows = buildAssigneeRows(
      [user('a'), user('me'), user('b', { role: 'PRESIDENT' })],
      'me',
      null,
    );
    expect(rows.map((r) => [r.userId, r.isMe])).toEqual([
      ['me', true],
      ['a', false],
      ['b', false],
    ]);
  });

  it('never invents a Me row when the server list omits the caller', () => {
    // Review B1: a synthesized row offered an assignment bms-tms rejects (TMS_400_04).
    const rows = buildAssigneeRows([user('a')], 'me', 'me', 'Sara Ali');
    expect(rows.map((r) => r.userId)).toEqual(['a']);
    expect(buildAssigneeRows([], 'me', null)).toEqual([]);
  });

  it("falls back to the FM's own name for Me only", () => {
    const rows = buildAssigneeRows(
      [user('me', { fullName: null }), user('a', { fullName: null })],
      'me',
      null,
      'Sara Ali',
    );
    expect(rows.map((r) => r.fullName)).toEqual(['Sara Ali', null]);
  });

  it('marks the current assignee from the server flag or the ticket', () => {
    const rows = buildAssigneeRows([user('a', { isCurrentAssignee: true }), user('b')], 'me', 'b');
    expect(rows.filter((r) => r.isCurrent).map((r) => r.userId)).toEqual(['a', 'b']);
  });
});
