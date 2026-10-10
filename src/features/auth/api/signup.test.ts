import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import type { TFunction } from 'i18next';
import { ApiError } from '@/shared/api/errors';
import { apiRegistry, registerApiDependencies } from '@/shared/api/registry';
import { secureStorage } from '@/shared/lib/storage';
import { tokenStore } from '../lib/token-store';
import { useAuthStore } from '../stores/authStore';
import type { SignupFormValues } from '../lib/signup-schema';
import {
  mapRegisterError,
  mapVerifyError,
  registerCompanyRep,
  signupFailureMessage,
  verifySignupEmail,
} from './signup';

vi.mock('@/shared/i18n', () => ({ i18n: { t: (key: string) => key } }));

// The keychain: every write goes through secureStorage.setString.
vi.mock('@/shared/lib/storage', () => ({
  secureStorage: { getString: vi.fn(), setString: vi.fn(), remove: vi.fn() },
}));

const REGISTER_URL = 'https://bms.test.local/api/bms/company-reps/register';
const VERIFY_URL = 'https://bms.test.local/api/bms/company-reps/verify-email';
const TEMP_TOKEN = 'temp.jwt.token';
const SESSION_TOKEN = 'session.jwt.token';

const VALUES: SignupFormValues = {
  email: 'rep@company.com',
  firstName: 'Sara',
  lastName: 'Ali',
  mobile: '512345678',
  genderCode: 'FEMALE',
  password: 'Secret1@',
};

const REGISTER_RESPONSE = {
  success: true,
  message: 'ok',
  accessToken: TEMP_TOKEN,
  refreshToken: 'refresh',
  profileStatus: 'NEW',
  roles: ['COMPANY_REP'],
  firstName: 'Sara',
  lastName: 'Ali',
  userId: '3f2b9c1e-0000-4000-8000-000000000001',
};

const t = ((key: string) => key) as unknown as TFunction;

function apiError(status: number, code = 'UNKNOWN', message?: string): ApiError {
  return new ApiError({ status, code, service: 'bms', raw: null, ...(message ? { message } : {}) });
}

const server = setupServer();
const originalRegistry = { ...apiRegistry };

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
beforeEach(() => {
  vi.spyOn(tokenStore, 'write');
  vi.mocked(secureStorage.setString).mockClear();
  useAuthStore.setState({ status: 'unauthenticated', token: null, user: null });
});
afterEach(() => {
  server.resetHandlers();
  registerApiDependencies(originalRegistry);
  vi.restoreAllMocks();
});
afterAll(() => server.close());

function expectNothingPersisted(): void {
  expect(tokenStore.write).not.toHaveBeenCalled();
  expect(secureStorage.setString).not.toHaveBeenCalled();
  // Nor is it promoted to the in-memory session the auth interceptor reads.
  expect(useAuthStore.getState()).toMatchObject({ status: 'unauthenticated', token: null });
}

describe('registerCompanyRep (BMS POST api/bms/company-reps/register)', () => {
  it('posts the form as UmsCompanyRepCreateRequest, without a session header or cookies', async () => {
    // A stale session must never ride along on the public register call.
    registerApiDependencies({ getActiveToken: () => SESSION_TOKEN });
    let seen: {
      body: unknown;
      auth: string | null;
      skip: string | null;
      credentials: RequestCredentials;
    } | null = null;
    server.use(
      http.post(REGISTER_URL, async ({ request }) => {
        seen = {
          body: await request.json(),
          auth: request.headers.get('authorization'),
          skip: request.headers.get('x-skip-auth'),
          credentials: request.credentials,
        };
        return HttpResponse.json(REGISTER_RESPONSE);
      }),
    );

    const outcome = await registerCompanyRep(VALUES);

    expect(seen).toEqual({ body: VALUES, auth: null, skip: null, credentials: 'omit' });
    expect(outcome).toEqual({ kind: 'success', tempToken: TEMP_TOKEN });
    expectNothingPersisted();
  });

  it('treats a 2xx without an accessToken as a failure', async () => {
    server.use(http.post(REGISTER_URL, () => HttpResponse.json({ success: true })));
    await expect(registerCompanyRep(VALUES)).resolves.toEqual({
      kind: 'failure',
      failure: { reason: 'other', error: null },
    });
  });

  it('maps the duplicate-email 500 BMS sends to emailTaken', async () => {
    server.use(
      http.post(REGISTER_URL, () =>
        HttpResponse.json(
          {
            message:
              'Registration failed: [400] {"code":"UMS_400_01","message":"Email is already used"}',
          },
          { status: 500 },
        ),
      ),
    );
    await expect(registerCompanyRep(VALUES)).resolves.toEqual({
      kind: 'failure',
      failure: { reason: 'emailTaken' },
    });
  });
});

describe('verifySignupEmail (BMS POST api/bms/company-reps/verify-email)', () => {
  it('sends the temp token as an explicit Bearer header, never the session token', async () => {
    registerApiDependencies({ getActiveToken: () => SESSION_TOKEN, isAuthenticated: () => true });
    let seen: { body: unknown; auth: string | null; skip: string | null } | null = null;
    server.use(
      http.post(VERIFY_URL, async ({ request }) => {
        seen = {
          body: await request.json(),
          auth: request.headers.get('authorization'),
          skip: request.headers.get('x-skip-auth'),
        };
        return new HttpResponse(null, { status: 200 });
      }),
    );

    await expect(verifySignupEmail(TEMP_TOKEN, '1234')).resolves.toEqual({ kind: 'success' });

    expect(seen).toEqual({ body: { otpCode: '1234' }, auth: `Bearer ${TEMP_TOKEN}`, skip: null });
    expectNothingPersisted();
  });

  it('sends the temp token when there is no session at all', async () => {
    let auth: string | null = null;
    server.use(
      http.post(VERIFY_URL, ({ request }) => {
        auth = request.headers.get('authorization');
        return new HttpResponse(null, { status: 200 });
      }),
    );
    await verifySignupEmail(TEMP_TOKEN, '1234');
    expect(auth).toBe(`Bearer ${TEMP_TOKEN}`);
  });

  it('maps the no-traceId 500 a wrong OTP returns to invalidCode', async () => {
    server.use(
      http.post(VERIFY_URL, () =>
        HttpResponse.json({ code: 'INTERNAL_ERROR', message: 'Invalid OTP' }, { status: 500 }),
      ),
    );
    await expect(verifySignupEmail(TEMP_TOKEN, '0000')).resolves.toEqual({
      kind: 'failure',
      failure: { reason: 'invalidCode' },
    });
    expectNothingPersisted();
  });

  it('a 401 (expired temp token) is invalidCode and never logs the session out', async () => {
    const logout = vi.fn(async () => {});
    registerApiDependencies({
      logout,
      isAuthenticated: () => true,
      getActiveToken: () => SESSION_TOKEN,
    });
    server.use(http.post(VERIFY_URL, () => HttpResponse.json({}, { status: 401 })));
    await expect(verifySignupEmail(TEMP_TOKEN, '1234')).resolves.toEqual({
      kind: 'failure',
      failure: { reason: 'invalidCode' },
    });
    expect(logout).not.toHaveBeenCalled();
  });

  it('a dropped connection keeps the transport error for the shared copy', async () => {
    server.use(http.post(VERIFY_URL, () => HttpResponse.error()));
    const outcome = await verifySignupEmail(TEMP_TOKEN, '1234');
    expect(outcome.kind).toBe('failure');
    if (outcome.kind !== 'failure') return;
    expect(outcome.failure.reason).toBe('other');
    expect(signupFailureMessage(outcome.failure, 'verify', t)).toBe('errors.requestFailed');
  });
});

describe('signup error mapping', () => {
  it('verify: blank/wrong code (400, 500) and auth failures (401, 403) are invalidCode', () => {
    for (const status of [400, 401, 403, 404, 500]) {
      expect(mapVerifyError(apiError(status))).toEqual({ reason: 'invalidCode' });
    }
  });

  it('verify: 429, gateway errors and transport failures are not blamed on the code', () => {
    for (const status of [0, 429, 502, 503, 504]) {
      expect(mapVerifyError(apiError(status)).reason).toBe('other');
    }
    expect(mapVerifyError(new Error('boom'))).toEqual({ reason: 'other', error: null });
  });

  it('register: 409 and the UMS duplicate codes/messages are emailTaken', () => {
    expect(mapRegisterError(apiError(409))).toEqual({ reason: 'emailTaken' });
    expect(mapRegisterError(apiError(400, 'UMS_400_01'))).toEqual({ reason: 'emailTaken' });
    expect(
      mapRegisterError(apiError(500, 'UNKNOWN', 'Registration failed: Email is already used')),
    ).toEqual({ reason: 'emailTaken' });
    expect(
      mapRegisterError(
        apiError(500, 'UNKNOWN', 'Company representative already registered with this email'),
      ),
    ).toEqual({ reason: 'emailTaken' });
  });

  it('register: a duplicate MOBILE is not reported as a duplicate email', () => {
    const failure = mapRegisterError(
      apiError(500, 'UNKNOWN', 'This mobile number is already verified by another user'),
    );
    expect(failure.reason).toBe('other');
  });

  it('messages: specific keys, shared copy for transport/429/gateway, step fallback otherwise', () => {
    expect(signupFailureMessage({ reason: 'emailTaken' }, 'register', t)).toBe(
      'fm.signup.errors.emailTaken',
    );
    expect(signupFailureMessage({ reason: 'invalidCode' }, 'verify', t)).toBe(
      'fm.signup.errors.invalidCode',
    );
    expect(
      signupFailureMessage({ reason: 'other', error: apiError(0, 'NETWORK_ERROR') }, 'register', t),
    ).toBe('errors.network');
    expect(signupFailureMessage({ reason: 'other', error: apiError(429) }, 'verify', t)).toBe(
      'errors.tooManyRequests',
    );
    expect(signupFailureMessage({ reason: 'other', error: apiError(503) }, 'register', t)).toBe(
      'errors.server',
    );
    // A plain register 500 (not a duplicate) gets the signup copy, not "server error".
    expect(signupFailureMessage({ reason: 'other', error: apiError(500) }, 'register', t)).toBe(
      'fm.signup.errors.registerFailed',
    );
    expect(signupFailureMessage({ reason: 'other', error: null }, 'verify', t)).toBe(
      'fm.signup.errors.verifyFailed',
    );
  });
});
