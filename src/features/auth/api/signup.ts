import { z } from 'zod';
import type { TFunction } from 'i18next';
import { bmsClient } from '@/shared/api/clients';
import { ApiError, ERROR_CODES, getUserMessage } from '@/shared/api/errors';
import type { SignupFormValues } from '../lib/signup-schema';

/** Relative to the BMS base URL. Public (BMS SecurityConstants). */
export const COMPANY_REP_REGISTER_PATH = 'api/bms/company-reps/register';
/** Authenticated by the TEMP token `register` returns (BMS c9ec2bc). */
export const COMPANY_REP_VERIFY_EMAIL_PATH = 'api/bms/company-reps/verify-email';

// BMS UmsCompanyRepCreateResponse. Only the temp accessToken is needed: it is
// the one credential verify-email accepts. The refresh token is ignored.
const registerResponseSchema = z.object({ accessToken: z.string().min(1) });

/**
 * Why a signup step failed. `emailTaken` and `invalidCode` have their own copy;
 * `other` carries the ApiError (when there is one) so transport and rate-limit
 * failures get the shared wording from `getUserMessage`.
 */
export type SignupFailure =
  | { reason: 'emailTaken' }
  | { reason: 'invalidCode' }
  | { reason: 'other'; error: ApiError | null };

export type RegisterOutcome =
  | { kind: 'success'; tempToken: string }
  | { kind: 'failure'; failure: SignupFailure };
export type VerifyOutcome = { kind: 'success' } | { kind: 'failure'; failure: SignupFailure };

// Tells the auth interceptor to leave the Authorization header alone (it then
// strips this marker). Without it the interceptor would attach, or overwrite
// with, whatever session token is active.
const SKIP_SESSION_AUTH = { 'x-skip-auth': '1' } as const;

// BMS rethrows UMS's error as a plain RuntimeException ("Registration failed:
// ..."), so a duplicate email usually arrives as a 500 carrying UMS's text:
// EMAIL_ALREADY_USED (UMS_400_01, "Email is already used") or
// COMPANY_REP_ALREADY_REGISTERED (UMS_409_10). Match the code or the wording.
const EMAIL_TAKEN_MESSAGE =
  /UMS_400_01|UMS_409_10|email is already used|already registered with this email/i;

function isTransportOrRateLimit(error: ApiError): boolean {
  return error.status === 0 || error.status === 429 || error.code === ERROR_CODES.TOO_MANY_REQUESTS;
}

export function mapRegisterError(error: unknown): SignupFailure {
  if (!(error instanceof ApiError)) return { reason: 'other', error: null };
  if (isTransportOrRateLimit(error)) return { reason: 'other', error };
  if (
    error.status === 409 ||
    error.code === 'EMAIL_ALREADY_REGISTERED' ||
    EMAIL_TAKEN_MESSAGE.test(`${error.code} ${error.message}`)
  ) {
    return { reason: 'emailTaken' };
  }
  return { reason: 'other', error };
}

/**
 * A wrong, blank or expired code comes back from BMS/UMS as a 500 with no
 * traceId (a raw RuntimeException), and an expired temp token as a 401. Both
 * mean "this code didn't work", so every definitive 4xx and a plain 500 map to
 * `invalidCode`. Transport failures, 429s and gateway errors (502-504) keep the
 * shared wording.
 */
export function mapVerifyError(error: unknown): SignupFailure {
  if (!(error instanceof ApiError)) return { reason: 'other', error: null };
  if (isTransportOrRateLimit(error)) return { reason: 'other', error };
  if ((error.status >= 400 && error.status < 500) || error.status === 500) {
    return { reason: 'invalidCode' };
  }
  return { reason: 'other', error };
}

/** User-facing copy for a failure. `step` picks the fallback for `other`. */
export function signupFailureMessage(
  failure: SignupFailure,
  step: 'register' | 'verify',
  t: TFunction,
): string {
  if (failure.reason === 'emailTaken') return t('fm.signup.errors.emailTaken');
  if (failure.reason === 'invalidCode') return t('fm.signup.errors.invalidCode');
  if (failure.error && (isTransportOrRateLimit(failure.error) || failure.error.status >= 502)) {
    return getUserMessage(failure.error, t);
  }
  return t(
    step === 'register' ? 'fm.signup.errors.registerFailed' : 'fm.signup.errors.verifyFailed',
  );
}

/**
 * Creates the company-rep account. Never throws. The returned temp token must
 * stay in memory: it is NOT a session and is never written to the token store.
 */
export async function registerCompanyRep(values: SignupFormValues): Promise<RegisterOutcome> {
  let body: unknown;
  try {
    body = await bmsClient
      .post(COMPANY_REP_REGISTER_PATH, { json: values, headers: SKIP_SESSION_AUTH })
      .json<unknown>();
  } catch (error) {
    return { kind: 'failure', failure: mapRegisterError(error) };
  }
  const parsed = registerResponseSchema.safeParse(body);
  if (!parsed.success) return { kind: 'failure', failure: { reason: 'other', error: null } };
  return { kind: 'success', tempToken: parsed.data.accessToken };
}

/** Verifies the 4-digit email code with the temp token sent as an explicit header. Never throws. */
export async function verifySignupEmail(
  tempToken: string,
  otpCode: string,
): Promise<VerifyOutcome> {
  try {
    await bmsClient.post(COMPANY_REP_VERIFY_EMAIL_PATH, {
      json: { otpCode },
      headers: { ...SKIP_SESSION_AUTH, Authorization: `Bearer ${tempToken}` },
    });
  } catch (error) {
    return { kind: 'failure', failure: mapVerifyError(error) };
  }
  return { kind: 'success' };
}
