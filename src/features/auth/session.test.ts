import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { delay, http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { bmsClient, communityClient, tmsClient, umsClient } from '@/shared/api/clients';
import { apiRegistry, registerApiDependencies } from '@/shared/api/registry';
import { secureStorage } from '@/shared/lib/storage';
import { queryClient } from '@/shared/query';
import { guardRedirect } from './lib/boot-guard';
import { FM_TOKEN_KEY } from './lib/token-store';
import { wireSessionToApi } from './lib/wire-api';
import { useAuthStore } from './stores/authStore';
import { fakeJwt, umsWebClaims } from './test/jwt-fixture';

// i18next is not initialized under vitest; echo keys so the toast key is assertable.
vi.mock('@/shared/i18n', () => ({ i18n: { t: (key: string) => key } }));

vi.mock('@/shared/lib/storage', () => ({
  secureStorage: { getString: vi.fn(), setString: vi.fn(), remove: vi.fn() },
}));

const keychain = new Map<string, string>();
const server = setupServer();
const originalRegistry = { ...apiRegistry };
const TOKEN = fakeJwt(umsWebClaims());

const CLIENTS = [
  { name: 'ums', client: umsClient, base: 'https://ums.test.local' },
  { name: 'bms', client: bmsClient, base: 'https://bms.test.local' },
  { name: 'tms', client: tmsClient, base: 'https://tms.test.local' },
  { name: 'community', client: communityClient, base: 'https://community.test.local' },
] as const;

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
beforeEach(() => {
  keychain.clear();
  vi.mocked(secureStorage.getString).mockImplementation(async (k) => keychain.get(k) ?? null);
  vi.mocked(secureStorage.setString).mockImplementation(async (k, v) => {
    keychain.set(k, v);
  });
  vi.mocked(secureStorage.remove).mockImplementation(async (k) => {
    keychain.delete(k);
  });
  useAuthStore.setState({ status: 'booting', token: null, user: null });
  wireSessionToApi();
});
afterEach(() => {
  server.resetHandlers();
  vi.clearAllMocks();
  queryClient.clear();
  registerApiDependencies(originalRegistry);
});
afterAll(() => server.close());

describe('boot', () => {
  it('a stored token boots into (fm); the auth stack redirects away', async () => {
    keychain.set(FM_TOKEN_KEY, TOKEN);
    await useAuthStore.getState().hydrate();
    const { status, token, user } = useAuthStore.getState();
    expect({ status, token, name: user?.name }).toEqual({
      status: 'authenticated',
      token: TOKEN,
      name: 'Sara Ali',
    });
    expect(guardRedirect(status, 'fm')).toBeNull();
    expect(guardRedirect(status, 'auth')).toBe('/(fm)');
  });

  it('no stored token boots to login; (fm) redirects there', async () => {
    await useAuthStore.getState().hydrate();
    const { status } = useAuthStore.getState();
    expect(status).toBe('unauthenticated');
    expect(guardRedirect(status, 'fm')).toBe('/(auth)/login');
    expect(guardRedirect(status, 'auth')).toBeNull();
  });

  it('an unreadable keychain boots to login instead of hanging on the splash', async () => {
    vi.mocked(secureStorage.getString).mockRejectedValueOnce(new Error('keystore locked'));
    await useAuthStore.getState().hydrate();
    expect(useAuthStore.getState().status).toBe('unauthenticated');
  });

  it('nothing redirects while still booting', () => {
    expect(guardRedirect('booting', 'fm')).toBeNull();
    expect(guardRedirect('booting', 'auth')).toBeNull();
  });
});

describe('signed-in requests', () => {
  it('signIn persists the token to secure storage', async () => {
    await useAuthStore.getState().signIn(TOKEN, {
      id: null,
      email: 'rep@company.com',
      name: 'Sara',
      roles: ['COMPANY_USER'],
    });
    expect(keychain.get(FM_TOKEN_KEY)).toBe(TOKEN);
    expect(useAuthStore.getState().status).toBe('authenticated');
  });

  it.each(CLIENTS)(
    '$name client sends Authorization: Bearer and omits cookies',
    async ({ client, base }) => {
      useAuthStore.setState({ status: 'authenticated', token: TOKEN, user: null });
      let seen: { auth: string | null; credentials: RequestCredentials } | null = null;
      server.use(
        http.get(`${base}/api/ping`, ({ request }) => {
          seen = { auth: request.headers.get('authorization'), credentials: request.credentials };
          return HttpResponse.json({});
        }),
      );
      await client.get('api/ping').json();
      expect(seen).toEqual({ auth: `Bearer ${TOKEN}`, credentials: 'omit' });
    },
  );
});

describe('401 on any API call', () => {
  it('logs out exactly once for simultaneous 401s across all four clients', async () => {
    keychain.set(FM_TOKEN_KEY, TOKEN);
    await useAuthStore.getState().hydrate();
    queryClient.setQueryData(['tickets'], [{ id: 1 }]);

    const navigate = vi.fn();
    const pushToast = vi.fn();
    registerApiDependencies({ navigate, pushToast });
    for (const { base } of CLIENTS) {
      server.use(
        http.get(`${base}/api/secure`, async () => {
          await delay(5);
          return HttpResponse.json({}, { status: 401 });
        }),
      );
    }

    const results = await Promise.allSettled(
      [...CLIENTS, ...CLIENTS].map(({ client }) => client.get('api/secure').json()),
    );

    expect(results.every((r) => r.status === 'rejected')).toBe(true);
    expect(vi.mocked(secureStorage.remove)).toHaveBeenCalledTimes(1);
    expect(keychain.has(FM_TOKEN_KEY)).toBe(false);
    expect(queryClient.getQueryData(['tickets'])).toBeUndefined();
    expect(useAuthStore.getState()).toMatchObject({ status: 'unauthenticated', token: null });
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith('/(auth)/login');
    expect(pushToast).toHaveBeenCalledTimes(1);
    expect(pushToast).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'error', title: 'fm.session.expired' }),
    );
  });

  it('a later 401 after signing in again logs out again (the latch resets)', async () => {
    const navigate = vi.fn();
    registerApiDependencies({ navigate, pushToast: vi.fn() });
    server.use(
      http.get('https://bms.test.local/api/secure', () => HttpResponse.json({}, { status: 401 })),
    );

    for (let i = 0; i < 2; i += 1) {
      useAuthStore.setState({ status: 'authenticated', token: TOKEN, user: null });
      await bmsClient
        .get('api/secure')
        .json()
        .catch(() => {});
    }
    expect(navigate).toHaveBeenCalledTimes(2);
  });

  it('a 401 while already signed out does nothing', async () => {
    useAuthStore.setState({ status: 'unauthenticated', token: null, user: null });
    const navigate = vi.fn();
    const pushToast = vi.fn();
    registerApiDependencies({ navigate, pushToast });
    server.use(
      http.get('https://ums.test.local/api/secure', () => HttpResponse.json({}, { status: 401 })),
    );
    await umsClient
      .get('api/secure')
      .json()
      .catch(() => {});
    expect(navigate).not.toHaveBeenCalled();
    expect(pushToast).not.toHaveBeenCalled();
    expect(secureStorage.remove).not.toHaveBeenCalled();
  });
});
