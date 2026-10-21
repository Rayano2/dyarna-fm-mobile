import { tmsClient } from '@/shared/api/clients';
import { ticketPaths } from './paths';

export type AssignableRole = 'COMPANY_REP' | 'PRESIDENT';

export interface AssignableUser {
  userId: string;
  /** Null when bms-tms could not resolve the name from UMS. */
  fullName: string | null;
  role: AssignableRole;
  isCurrentAssignee: boolean;
}

function toAssignableUser(raw: unknown): AssignableUser | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const id = r.userId;
  if ((typeof id !== 'string' && typeof id !== 'number') || id === '') return null;
  const name = typeof r.fullName === 'string' ? r.fullName.trim() : '';
  return {
    userId: String(id),
    fullName: name || null,
    role: r.role === 'PRESIDENT' ? 'PRESIDENT' : 'COMPANY_REP',
    isCurrentAssignee: r.isCurrentAssignee === true,
  };
}

/** Drops malformed entries; anything but an array is an empty list. */
export function mapAssignableUsers(raw: unknown): AssignableUser[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((entry) => toAssignableUser(entry)).filter((u): u is AssignableUser => u !== null);
}

/** `GET api/tms/tickets/{ticketNumber}/assignable-users`. May be empty. */
export async function getAssignableUsers(ticketNumber: string): Promise<AssignableUser[]> {
  const raw = await tmsClient.get(ticketPaths.assignableUsers(ticketNumber)).json<unknown>();
  return mapAssignableUsers(raw);
}
