import type { AssignableRole, AssignableUser } from '../api/get-assignable-users';

export interface AssigneeRow {
  userId: string;
  isMe: boolean;
  fullName: string | null;
  role: AssignableRole;
  isCurrent: boolean;
}

/**
 * Whether the signed-in FM may take the ticket themselves. Only the server's
 * assignable-users list says so: nothing is assumed while it is loading or
 * when it omits the caller (FM #110 review B1).
 */
export function isSelfAssignable(
  users: readonly AssignableUser[] | undefined,
  myId: string | null,
): boolean {
  return !!myId && !!users?.some((u) => u.userId === myId);
}

/**
 * Picker rows in server order, with the signed-in FM moved to the top when —
 * and only when — the server lists them. `currentAssigneeId` (from the ticket
 * detail) backs up `isCurrentAssignee`. `myName` stands in when the server
 * could not resolve the caller's own name.
 */
export function buildAssigneeRows(
  users: readonly AssignableUser[],
  myId: string | null,
  currentAssigneeId: string | null,
  myName: string | null = null,
): AssigneeRow[] {
  const rows = users.map(
    (u): AssigneeRow => ({
      userId: u.userId,
      isMe: u.userId === myId,
      fullName: u.fullName ?? (u.userId === myId ? myName : null),
      role: u.role,
      isCurrent:
        u.isCurrentAssignee || (currentAssigneeId !== null && u.userId === currentAssigneeId),
    }),
  );
  const me = rows.filter((r) => r.isMe);
  return [...me, ...rows.filter((r) => !r.isMe)];
}
