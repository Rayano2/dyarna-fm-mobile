import type { SessionStatus } from '../stores/authStore';

export const FM_HOME_HREF = '/(fm)';
export const LOGIN_HREF = '/(auth)/login';

export type RouteGroup = 'auth' | 'fm';

/**
 * Where a route group's layout must send the user, or null to render it.
 * While booting nothing redirects: the root layout keeps the splash up.
 */
export function guardRedirect(
  status: SessionStatus,
  group: RouteGroup,
): typeof FM_HOME_HREF | typeof LOGIN_HREF | null {
  if (status === 'booting') return null;
  if (group === 'fm' && status !== 'authenticated') return LOGIN_HREF;
  if (group === 'auth' && status === 'authenticated') return FM_HOME_HREF;
  return null;
}
