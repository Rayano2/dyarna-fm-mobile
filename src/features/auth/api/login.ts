import { z } from 'zod';
import { bmsClient } from '@/shared/api/clients';
import { ApiError } from '@/shared/api/errors';
import { isFmRoleAllowed, userFromToken, type FmUser } from '../lib/fm-user';
import type { LoginFormValues } from '../lib/login-schema';

/**
 * Relative to the BMS base URL. Sits under `/api/auth/`, so the error
 * interceptor never treats a wrong password as a session expiry.
 */
export const TMS_LOGIN_PATH = 'api/auth/tms/login';

// BMS TmsLoginResponse: { accessToken, refreshToken, message }. Role and name
// are not in the body, they're in the JWT claims (UMS JwtUtils.generateWebJwtToken).
const tmsLoginResponseSchema = z.object({ accessToken: z.string().min(1) });

export type LoginOutcome =
  | { kind: 'success'; token: string; user: FmUser }
  | { kind: 'invalidCredentials' }
  | { kind: 'accessDenied' }
  | { kind: 'network' };

export type LoginFailureKind = Exclude<LoginOutcome['kind'], 'success'>;

/**
 * Email/password sign-in. Never throws: every failure is mapped to the banner
 * the login screen shows.
 *
 * BMS answers EVERY failure with 401 (AuthController catches all exceptions,
 * including UMS's role refusal), so a 401/400 can only ever mean "wrong
 * credentials". The role check is done on the returned token.
 */
export async function loginFm(credentials: LoginFormValues): Promise<LoginOutcome> {
  let body: unknown;
  try {
    body = await bmsClient.post(TMS_LOGIN_PATH, { json: credentials }).json<unknown>();
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 400 || error.status === 401) return { kind: 'invalidCredentials' };
      if (error.status === 403) return { kind: 'accessDenied' };
    }
    return { kind: 'network' };
  }

  const parsed = tmsLoginResponseSchema.safeParse(body);
  // A 2xx without a token is a broken server response, not a credential problem.
  if (!parsed.success) return { kind: 'network' };

  const token = parsed.data.accessToken;
  const user = userFromToken(token, credentials.email);
  if (!user || !isFmRoleAllowed(user.roles)) return { kind: 'accessDenied' };
  return { kind: 'success', token, user };
}
