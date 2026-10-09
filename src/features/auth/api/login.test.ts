import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { apiRegistry, registerApiDependencies } from '@/shared/api/registry';
import { fakeJwt, umsWebClaims } from '../test/jwt-fixture';
import { loginFm } from './login';

const LOGIN_URL = 'https://bms.test.local/api/auth/tms/login';
const CREDENTIALS = { email: 'rep@company.com', password: 'secret1' };

const server = setupServer();
const originalRegistry = { ...apiRegistry };

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  registerApiDependencies(originalRegistry);
});
afterAll(() => server.close());

describe('loginFm (BMS POST /api/auth/tms/login)', () => {
  it('posts the credentials without cookies and maps the token to an FM user', async () => {
    const token = fakeJwt(umsWebClaims());
    let seen: { body: unknown; credentials: RequestCredentials; auth: string | null } | null = null;
    server.use(
      http.post(LOGIN_URL, async ({ request }) => {
        seen = {
          body: await request.json(),
          credentials: request.credentials,
          auth: request.headers.get('authorization'),
        };
        return HttpResponse.json({ accessToken: token, refreshToken: 'r', message: 'ok' });
      }),
    );

    const outcome = await loginFm(CREDENTIALS);

    expect(seen).toEqual({ body: CREDENTIALS, credentials: 'omit', auth: null });
    expect(outcome).toEqual({
      kind: 'success',
      token,
      user: {
        id: '3f2b9c1e-0000-4000-8000-000000000001',
        email: 'rep@company.com',
        name: 'Sara Ali',
        roles: ['COMPANY_USER', 'COMPANY_REP'],
      },
    });
  });

  it('falls back to the email local part when the token has no name (as the web does)', async () => {
    const token = fakeJwt(umsWebClaims({ firstName: null, lastName: null }));
    server.use(http.post(LOGIN_URL, () => HttpResponse.json({ accessToken: token })));
    const outcome = await loginFm(CREDENTIALS);
    expect(outcome.kind === 'success' && outcome.user.name).toBe('rep');
  });

  it('maps 401 to invalidCredentials and does NOT trigger the session-expiry logout', async () => {
    const logout = vi.fn(async () => {});
    registerApiDependencies({ logout, isAuthenticated: () => true });
    server.use(
      http.post(LOGIN_URL, () =>
        HttpResponse.json({ message: 'Invalid credentials' }, { status: 401 }),
      ),
    );
    await expect(loginFm(CREDENTIALS)).resolves.toEqual({ kind: 'invalidCredentials' });
    expect(logout).not.toHaveBeenCalled();
  });

  it('maps a 400 (bean validation) to invalidCredentials', async () => {
    server.use(http.post(LOGIN_URL, () => HttpResponse.json({}, { status: 400 })));
    await expect(loginFm(CREDENTIALS)).resolves.toEqual({ kind: 'invalidCredentials' });
  });

  it('denies a token whose roles include neither COMPANY_USER nor COMPANY_REP', async () => {
    const token = fakeJwt(umsWebClaims({ roles: ['RESIDENT'] }));
    server.use(http.post(LOGIN_URL, () => HttpResponse.json({ accessToken: token })));
    await expect(loginFm(CREDENTIALS)).resolves.toEqual({ kind: 'accessDenied' });
  });

  it('allows a COMPANY_USER-only token (the role UMS tms login requires)', async () => {
    const token = fakeJwt(umsWebClaims({ roles: ['COMPANY_USER'] }));
    server.use(http.post(LOGIN_URL, () => HttpResponse.json({ accessToken: token })));
    await expect(loginFm(CREDENTIALS)).resolves.toMatchObject({ kind: 'success' });
  });

  it('denies a token that is not a JWT', async () => {
    server.use(http.post(LOGIN_URL, () => HttpResponse.json({ accessToken: 'opaque' })));
    await expect(loginFm(CREDENTIALS)).resolves.toEqual({ kind: 'accessDenied' });
  });

  it('maps a 403 to accessDenied', async () => {
    server.use(http.post(LOGIN_URL, () => HttpResponse.json({}, { status: 403 })));
    await expect(loginFm(CREDENTIALS)).resolves.toEqual({ kind: 'accessDenied' });
  });

  it('maps a dropped connection to network', async () => {
    server.use(http.post(LOGIN_URL, () => HttpResponse.error()));
    await expect(loginFm(CREDENTIALS)).resolves.toEqual({ kind: 'network' });
  });

  it('maps a 5xx to network', async () => {
    server.use(http.post(LOGIN_URL, () => HttpResponse.json({}, { status: 500 })));
    await expect(loginFm(CREDENTIALS)).resolves.toEqual({ kind: 'network' });
  });

  it('maps a 200 without an accessToken to network, not a credential error', async () => {
    server.use(http.post(LOGIN_URL, () => HttpResponse.json({ message: 'ok' })));
    await expect(loginFm(CREDENTIALS)).resolves.toEqual({ kind: 'network' });
  });
});
