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
  it('pins Me first and keeps the rest in server order', () => {
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

  it('pins Me even when the server list omits the caller', () => {
    const rows = buildAssigneeRows([user('a')], 'me', 'me');
    expect(rows[0]).toEqual({
      userId: 'me',
      isMe: true,
      fullName: null,
      role: 'COMPANY_REP',
      isCurrent: true,
    });
  });

  it('marks the current assignee from the server flag or the ticket', () => {
    const rows = buildAssigneeRows([user('a', { isCurrentAssignee: true }), user('b')], 'me', 'b');
    expect(rows.filter((r) => r.isCurrent).map((r) => r.userId)).toEqual(['a', 'b']);
  });

  it('an empty list still offers Me; without a user id it is just the list', () => {
    expect(buildAssigneeRows([], 'me', null).map((r) => r.userId)).toEqual(['me']);
    expect(buildAssigneeRows([user('a')], null, null).map((r) => r.userId)).toEqual(['a']);
  });
});
