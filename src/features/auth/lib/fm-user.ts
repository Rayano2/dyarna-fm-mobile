import { jwtClaims, jwtUserId } from '@/shared/lib/jwt';

/**
 * Roles allowed to use the FM app.
 *
 * BMS `POST /api/auth/tms/login` proxies UMS `authenticateForTms`, which only
 * issues a token to a user holding `COMPANY_USER` (UMS AuthServiceImpl:97).
 * The FM web checks `role === 'COMPANY_REP'`, but reads a `role` claim UMS
 * never issues and so always falls back to 'COMPANY_REP'. UMS puts the user's
 * role codes in a `roles` array. A company rep is registered with
 * `COMPANY_REP`, so either role may sign in. Anything else (a token missing
 * both) is refused on the client.
 */
export const FM_ALLOWED_ROLES: readonly string[] = ['COMPANY_USER', 'COMPANY_REP'];

export interface FmUser {
  /** JWT `sub` (UMS user id). Null when the token carries no usable id. */
  id: string | null;
  email: string;
  /** "firstName lastName", falling back to the email's local part (as the web does). */
  name: string;
  roles: string[];
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function normalizeRole(role: string): string {
  return role.startsWith('ROLE_') ? role.slice('ROLE_'.length) : role;
}

function rolesFromClaims(claims: Record<string, unknown>): string[] {
  const roles: string[] = [];
  for (const source of [claims.roles, claims.authorities]) {
    if (Array.isArray(source)) {
      for (const role of source) if (typeof role === 'string') roles.push(normalizeRole(role));
    }
  }
  const single = asString(claims.role);
  if (single) roles.push(normalizeRole(single));
  return [...new Set(roles)];
}

/** Builds the signed-in user from the session JWT's claims. Null if the token is not a JWT. */
export function userFromToken(token: string, fallbackEmail = ''): FmUser | null {
  const claims = jwtClaims(token);
  if (!claims) return null;
  const email = asString(claims.email) ?? fallbackEmail;
  const fullName = [asString(claims.firstName), asString(claims.lastName)]
    .filter(Boolean)
    .join(' ');
  const name =
    fullName || asString(claims.name) || asString(claims.fullName) || email.split('@')[0] || '';
  return { id: jwtUserId(token), email, name, roles: rolesFromClaims(claims) };
}

export function isFmRoleAllowed(roles: readonly string[]): boolean {
  return roles.some((role) => FM_ALLOWED_ROLES.includes(role));
}
