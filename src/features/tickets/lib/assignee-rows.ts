import type { AssignableRole, AssignableUser } from '../api/get-assignable-users';

export interface AssigneeRow {
  userId: string;
  isMe: boolean;
  fullName: string | null;
  role: AssignableRole;
  isCurrent: boolean;
}

/**
 * Picker rows: the signed-in FM pinned first as "Me" (self-assign stays the
 * obvious choice), then everyone else in server order. "Me" is pinned even if
 * the server list omits the caller; the backend still has the final say
 * (`TMS_400_04`). `currentAssigneeId` backs up `isCurrentAssignee` from the
 * ticket detail.
 */
export function buildAssigneeRows(
  users: readonly AssignableUser[],
  myId: string | null,
  currentAssigneeId: string | null,
): AssigneeRow[] {
  const toRow = (u: AssignableUser): AssigneeRow => ({
    userId: u.userId,
    isMe: u.userId === myId,
    fullName: u.fullName,
    role: u.role,
    isCurrent:
      u.isCurrentAssignee || (currentAssigneeId !== null && u.userId === currentAssigneeId),
  });
  const others = users.filter((u) => u.userId !== myId).map((u) => toRow(u));
  if (!myId) return others;
  const mine = users.find((u) => u.userId === myId);
  const me: AssigneeRow = mine
    ? toRow(mine)
    : {
        userId: myId,
        isMe: true,
        fullName: null,
        role: 'COMPANY_REP',
        isCurrent: currentAssigneeId === myId,
      };
  return [me, ...others];
}
