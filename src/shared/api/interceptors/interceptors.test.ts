import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type Mock,
} from 'vitest';
import { delay, http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { handleUnconfirmedMutationError, queryClient } from '@/shared/query';
import { createApiClient, RETRY_CONFIG } from '../client';
import { ApiError } from '../errors';
import { apiRegistry, registerApiDependencies } from '../registry';
import { isForcedLogoutExempt } from './error';

const BASE = 'https://ums.test.local';
// The badge endpoint, spelled out here because `shared/` may not deep-import a
// feature. `notifications-api.endpoints.test.ts` asserts this literal matches
// the path the app actually calls, so the two cannot drift.
const UNREAD_COUNT_PATH = 'api/bms/notifications/unread-count';
const server = setupServer();
const client = createApiClient({ baseUrl: BASE, service: 'ums' });

// The unconfirmed-mutation refresh is fire-and-forget behind a single-flight
// latch; give the latch a full turn of the event loop to settle before
// asserting on it.
const flushMicrotasks = (): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, 0);
  });

const originalRegistry = { ...apiRegistry };

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  registerApiDependencies(originalRegistry);
});
afterAll(() => server.close());

describe('auth interceptor', () => {
  it('attaches the active token as a Bearer header', async () => {
    registerApiDependencies({ getActiveToken: () => 'tok-123' });
    let seenAuth: string | null = null;
    server.use(
      http.get(`${BASE}/ping`, ({ request }) => {
        seenAuth = request.headers.get('authorization');
        return HttpResponse.json({ ok: true });
      }),
    );
    await client.get('ping').json();
    expect(seenAuth).toBe('Bearer tok-123');
  });

  it('sends no Authorization header when there is no active token', async () => {
    registerApiDependencies({ getActiveToken: () => null });
    let seenAuth: string | null = 'unset';
    server.use(
      http.get(`${BASE}/ping`, ({ request }) => {
        seenAuth = request.headers.get('authorization');
        return HttpResponse.json({ ok: true });
      }),
    );
    await client.get('ping').json();
    expect(seenAuth).toBeNull();
  });

  it('x-skip-auth suppresses the registry token and is stripped from the request', async () => {
    registerApiDependencies({ getActiveToken: () => 'tok-123' });
    let seenAuth: string | null = 'unset';
    let seenSkip: string | null = 'unset';
    server.use(
      http.get(`${BASE}/ping`, ({ request }) => {
        seenAuth = request.headers.get('authorization');
        seenSkip = request.headers.get('x-skip-auth');
        return HttpResponse.json({ ok: true });
      }),
    );
    await client.get('ping', { headers: { 'x-skip-auth': '1' } }).json();
    expect(seenAuth).toBeNull();
    expect(seenSkip).toBeNull();
  });

  it('x-skip-auth preserves a manually supplied Authorization header (signup token override)', async () => {
    registerApiDependencies({ getActiveToken: () => 'stale-phase-token' });
    let seenAuth: string | null = null;
    server.use(
      http.post(`${BASE}/link`, ({ request }) => {
        seenAuth = request.headers.get('authorization');
        return HttpResponse.json({ ok: true });
      }),
    );
    await client
      .post('link', { headers: { 'x-skip-auth': '1', Authorization: 'Bearer fresh-token' } })
      .json();
    expect(seenAuth).toBe('Bearer fresh-token');
  });
});

describe('error interceptor', () => {
  it('normalizes error responses into ApiError with the flat-body code', async () => {
    server.use(
      http.get(`${BASE}/boom`, () =>
        HttpResponse.json({ code: 'BMS_400_07', message: 'nope', success: false }, { status: 400 }),
      ),
    );
    const error = await client
      .get('boom')
      .json()
      .catch((error_: unknown) => error_);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).code).toBe('BMS_400_07');
    expect((error as ApiError).message).toBe('nope');
    expect((error as ApiError).service).toBe('ums');
  });

  it('preserves 429 body fields through ky (regression: ky v2 consumes the body before beforeError)', async () => {
    server.use(
      http.get(`${BASE}/limited`, () =>
        HttpResponse.json(
          { error: 'too_many_requests', message: 'slow down', retry_after_seconds: 8 },
          { status: 429 },
        ),
      ),
    );
    const error = await client
      .get('limited', { retry: 0 })
      .json()
      .catch((error_: unknown) => error_);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).code).toBe('TOO_MANY_REQUESTS');
    expect((error as ApiError).retryAfterSeconds).toBe(8);
  });

  it('reports NETWORK_ERROR only when the device is actually offline', async () => {
    registerApiDependencies({ isDeviceOffline: async () => true });
    server.use(http.get(`${BASE}/down`, () => HttpResponse.error()));
    const error = await client
      .get('down', { retry: 0 })
      .json()
      .catch((error_: unknown) => error_);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).code).toBe('NETWORK_ERROR');
    expect((error as ApiError).status).toBe(0);
  });

  it('does not blame the connection when the device is online (issue #18)', async () => {
    registerApiDependencies({ isDeviceOffline: async () => false });
    server.use(http.post(`${BASE}/act`, () => HttpResponse.error()));
    const error = await client
      .post('act', { retry: 0 })
      .json()
      .catch((error_: unknown) => error_);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).code).toBe('REQUEST_FAILED');
    expect((error as ApiError).status).toBe(0);
  });

  it('classifies a ky timeout as TIMEOUT, not a missing connection', async () => {
    registerApiDependencies({ isDeviceOffline: async () => false });
    server.use(
      http.post(`${BASE}/slow`, async () => {
        await delay(200);
        return HttpResponse.json({ ok: true });
      }),
    );
    const error = await client
      .post('slow', { retry: 0, timeout: 20 })
      .json()
      .catch((error_: unknown) => error_);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).code).toBe('TIMEOUT');
  });

  it('falls back to REQUEST_FAILED when connectivity cannot be determined', async () => {
    // Registry default (no networkService registered, e.g. before boot
    // finishes): never accuse the user's connection.
    server.use(http.get(`${BASE}/down`, () => HttpResponse.error()));
    const error = await client
      .get('down', { retry: 0 })
      .json()
      .catch((error_: unknown) => error_);
    expect((error as ApiError).code).toBe('REQUEST_FAILED');
  });
});

describe('401 session-expiry handling', () => {
  let logout: Mock<() => Promise<void>>;
  let navigate: Mock<() => void>;
  let pushToast: Mock<() => void>;
  let authenticated: boolean;

  beforeEach(() => {
    authenticated = true;
    logout = vi.fn(async () => {
      // Simulate real logout latency so concurrent 401s race the latch.
      await new Promise((r) => setTimeout(r, 25));
      authenticated = false;
    });
    navigate = vi.fn(() => {});
    pushToast = vi.fn(() => {});
    registerApiDependencies({
      logout,
      navigate,
      pushToast,
      isAuthenticated: () => authenticated,
      // The forced logout only fires for a 401 sent with the active session.
      getActiveToken: () => (authenticated ? 'session-token' : null),
    });
    server.use(
      http.get(`${BASE}/secure`, () => HttpResponse.json({}, { status: 401 })),
      http.get(`${BASE}/api/auth/check-status`, () => HttpResponse.json({}, { status: 401 })),
      http.post(`${BASE}/api/legal/TERMS_AND_CONDITIONS/accept`, () =>
        HttpResponse.json({}, { status: 401 }),
      ),
      http.get(`${BASE}/api/legal/TERMS_AND_CONDITIONS`, () =>
        HttpResponse.json({}, { status: 401 }),
      ),
      http.get(`${BASE}/${UNREAD_COUNT_PATH}`, () => HttpResponse.json({}, { status: 401 })),
      http.get(`${BASE}/api/bms/notifications`, () => HttpResponse.json({}, { status: 401 })),
    );
  });

  it('logs out, toasts, and navigates to login on a 401', async () => {
    await client
      .get('secure')
      .json()
      .catch(() => {});
    expect(logout).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith('/(auth)/login');
    expect(pushToast).toHaveBeenCalledTimes(1);
  });

  it('ignores a stale 401 sent with a previous session token', async () => {
    let token = 'old-token';
    registerApiDependencies({ getActiveToken: () => token });
    server.use(
      http.get(`${BASE}/slow-secure`, async () => {
        // The user signs in again while this request is in flight.
        token = 'new-token';
        return HttpResponse.json({}, { status: 401 });
      }),
    );
    await client
      .get('slow-secure')
      .json()
      .catch(() => {});
    expect(logout).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
    expect(pushToast).not.toHaveBeenCalled();
  });

  it('fires a single logout for concurrent 401s', async () => {
    await Promise.all([
      client
        .get('secure')
        .json()
        .catch(() => {}),
      client
        .get('secure')
        .json()
        .catch(() => {}),
      client
        .get('secure')
        .json()
        .catch(() => {}),
    ]);
    expect(logout).toHaveBeenCalledTimes(1);
  });

  it('does not log out for 401s from auth endpoints', async () => {
    await client
      .get('api/auth/check-status')
      .json()
      .catch(() => {});
    expect(logout).not.toHaveBeenCalled();
  });

  // The after-login Terms gate tells the user "try again" and renders the
  // failure inline. If a 401 from its accept call took the session-expiry
  // path, tapping that button would throw the user out to the login screen —
  // so this one endpoint is exempt, and the error must reach the caller.
  it('does not log out for a 401 from the legal accept endpoint', async () => {
    const error = await client
      .post('api/legal/TERMS_AND_CONDITIONS/accept')
      .json()
      .catch((error_: unknown) => error_);

    expect(logout).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
    expect(pushToast).not.toHaveBeenCalled();
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(401);
  });

  // The other direction: the exemption is anchored to `.../accept` only. A
  // 401 from any other authenticated endpoint — including the rest of the
  // legal namespace — still means the session is gone.
  it('still logs out for a 401 from a non-accept legal endpoint', async () => {
    await client
      .get('api/legal/TERMS_AND_CONDITIONS')
      .json()
      .catch(() => {});

    expect(logout).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith('/(auth)/login');
  });

  // The header bell badge refetches on mount and on focus from a component
  // rendered on every tab, so letting its 401 expire the session would throw
  // the user out of the app over a decorative number. A notifications outage
  // must degrade the badge, not the login state.
  it('does not log out for a 401 from the unread-count badge endpoint', async () => {
    const error = await client
      .get(UNREAD_COUNT_PATH)
      .json()
      .catch((error_: unknown) => error_);

    expect(logout).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
    expect(pushToast).not.toHaveBeenCalled();
    // The query still fails — the badge simply renders no number.
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(401);
  });

  // The other direction: the exemption is the ONE badge endpoint, not the
  // notifications namespace. The inbox list is a screen the user deliberately
  // opened, so a 401 there still means the session is gone.
  it('still logs out for a 401 from the notifications list', async () => {
    await client
      .get('api/bms/notifications')
      .json()
      .catch(() => {});

    expect(logout).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith('/(auth)/login');
  });

  it('does not log out when already unauthenticated', async () => {
    authenticated = false;
    await client
      .get('secure')
      .json()
      .catch(() => {});
    expect(logout).not.toHaveBeenCalled();
  });
});

describe('retry policy', () => {
  // GUARD (issue #18). A response-less failure does NOT mean the server
  // ignored the request — it may have been processed and only the reply was
  // lost. Auto-retrying a non-idempotent verb would therefore create
  // duplicate bookings/tickets/votes, which is far worse than the honest
  // error we now show. If a future "fix" for flaky mutations adds a verb
  // here, this test must fail loudly rather than let a silent double-write
  // ship. Fix the classification/UX instead — never the retry list.
  const NEVER_AUTO_RETRY = ['post', 'patch', 'put', 'delete'];
  const SAFE_TO_AUTO_RETRY = new Set(['get', 'head', 'options']);

  it('never auto-retries a non-idempotent method', () => {
    for (const method of NEVER_AUTO_RETRY) {
      expect(RETRY_CONFIG.methods as readonly string[]).not.toContain(method);
    }
    for (const method of RETRY_CONFIG.methods as readonly string[]) {
      expect(SAFE_TO_AUTO_RETRY.has(method)).toBe(true);
    }
  });

  it('does not re-run mutations at the React Query layer either', () => {
    // The transport guard above is only half the surface: raising the global
    // mutation retry would replay a write that may already have landed, with
    // the same duplicate-booking consequence.
    expect(queryClient.getDefaultOptions().mutations?.retry).toBe(0);
  });

  it('sends a failing POST exactly once', async () => {
    let hits = 0;
    server.use(
      http.post(`${BASE}/mutate`, () => {
        hits += 1;
        return HttpResponse.json({}, { status: 503 });
      }),
    );
    await client
      .post('mutate')
      .json()
      .catch(() => {});
    expect(hits).toBe(1);
  });

  it('does not retry 500s at the transport layer (React Query owns logical retries)', async () => {
    let hits = 0;
    server.use(
      http.get(`${BASE}/flaky-500`, () => {
        hits += 1;
        return HttpResponse.json({}, { status: 500 });
      }),
    );
    await client
      .get('flaky-500')
      .json()
      .catch(() => {});
    expect(hits).toBe(1);
  });

  it('retries transport-level 503s', async () => {
    let hits = 0;
    server.use(
      http.get(`${BASE}/flaky-503`, () => {
        hits += 1;
        return HttpResponse.json({}, { status: 503 });
      }),
    );
    await client
      .get('flaky-503')
      .json()
      .catch(() => {});
    expect(hits).toBe(3); // initial + 2 retries
  });
});

describe('transport-failure retry (issue #26)', () => {
  it('retries a GET whose connection dies, then reports REQUEST_FAILED', async () => {
    registerApiDependencies({ isDeviceOffline: async () => false });
    let hits = 0;
    server.use(
      http.get(`${BASE}/dead-socket`, () => {
        hits += 1;
        return HttpResponse.error();
      }),
    );
    const error = await client
      .get('dead-socket')
      .json()
      .catch((error_: unknown) => error_);
    expect(hits).toBe(3); // initial + 2 retries
    expect((error as ApiError).code).toBe('REQUEST_FAILED');
  });

  it('still sends a mutation exactly once on the same failure', async () => {
    // The whole safety argument for `shouldRetry`: ky checks `retry.methods`
    // BEFORE calling it, so widening which failures retry cannot leak into
    // POST/PATCH/PUT/DELETE. If this ever reads 2, a write is being replayed.
    registerApiDependencies({ isDeviceOffline: async () => false });
    let hits = 0;
    server.use(
      http.post(`${BASE}/dead-socket-write`, () => {
        hits += 1;
        return HttpResponse.error();
      }),
    );
    const error = await client
      .post('dead-socket-write')
      .json()
      .catch((error_: unknown) => error_);
    expect(hits).toBe(1);
    expect((error as ApiError).code).toBe('REQUEST_FAILED');
  });

  it('never retries a timeout, on any method', async () => {
    registerApiDependencies({ isDeviceOffline: async () => false });
    let hits = 0;
    server.use(
      http.get(`${BASE}/never-answers`, async () => {
        hits += 1;
        await delay(200);
        return HttpResponse.json({ ok: true });
      }),
    );
    const error = await client
      .get('never-answers', { timeout: 20 })
      .json()
      .catch((error_: unknown) => error_);
    expect(hits).toBe(1);
    expect((error as ApiError).code).toBe('TIMEOUT');
  });
});

describe('unconfirmed-mutation refresh (issue #26)', () => {
  let invalidate: Mock<() => Promise<void>>;

  beforeEach(() => {
    invalidate = vi.fn(async () => {});
    vi.spyOn(queryClient, 'invalidateQueries').mockImplementation(
      invalidate as unknown as typeof queryClient.invalidateQueries,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("is the mutation cache's error handler", () => {
    expect(queryClient.getMutationCache().config.onError).toBe(handleUnconfirmedMutationError);
  });

  it('refetches active queries when a write could not be confirmed', async () => {
    registerApiDependencies({ isDeviceOffline: async () => false });
    server.use(http.post(`${BASE}/unconfirmed`, () => HttpResponse.error()));
    const error = await client
      .post('unconfirmed')
      .json()
      .catch((error_: unknown) => error_);

    handleUnconfirmedMutationError(error);
    await flushMicrotasks();

    expect(invalidate).toHaveBeenCalledTimes(1);
    expect(invalidate).toHaveBeenCalledWith({ refetchType: 'active' });
  });

  it('collapses a burst of unconfirmed writes into one refresh', async () => {
    registerApiDependencies({ isDeviceOffline: async () => false });
    server.use(http.post(`${BASE}/unconfirmed`, () => HttpResponse.error()));
    const error = await client
      .post('unconfirmed')
      .json()
      .catch((error_: unknown) => error_);

    handleUnconfirmedMutationError(error);
    handleUnconfirmedMutationError(error);
    handleUnconfirmedMutationError(error);
    await flushMicrotasks();

    expect(invalidate).toHaveBeenCalledTimes(1);
  });

  it('does not refresh when the server gave a definitive answer', async () => {
    server.use(
      http.post(`${BASE}/rejected`, () =>
        HttpResponse.json({ message: 'Invalid payload' }, { status: 400 }),
      ),
    );
    const error = await client
      .post('rejected')
      .json()
      .catch((error_: unknown) => error_);

    expect((error as ApiError).status).toBe(400);
    handleUnconfirmedMutationError(error);
    await flushMicrotasks();

    expect(invalidate).not.toHaveBeenCalled();
  });
});

describe('isForcedLogoutExempt', () => {
  const ORIGIN = 'https://api.dyarna.sa';

  it('exempts the unread-count endpoint', () => {
    expect(isForcedLogoutExempt(`${ORIGIN}/${UNREAD_COUNT_PATH}`)).toBe(true);
  });

  it('exempts it with a query string attached', () => {
    expect(isForcedLogoutExempt(`${ORIGIN}/${UNREAD_COUNT_PATH}?t=1`)).toBe(true);
  });

  it('keeps the exemption off the rest of the notifications feature', () => {
    expect(isForcedLogoutExempt(`${ORIGIN}/api/bms/notifications`)).toBe(false);
    expect(isForcedLogoutExempt(`${ORIGIN}/api/bms/notifications?page=0&size=20`)).toBe(false);
    expect(isForcedLogoutExempt(`${ORIGIN}/api/bms/notifications/read-all`)).toBe(false);
    expect(isForcedLogoutExempt(`${ORIGIN}/api/bms/notifications/abc-123/read`)).toBe(false);
  });

  it('keeps the exemption off the rest of the bms service', () => {
    expect(isForcedLogoutExempt(`${ORIGIN}/api/bms/projects/my-projects`)).toBe(false);
    expect(isForcedLogoutExempt(`${ORIGIN}/api/tms/tickets/resident`)).toBe(false);
  });

  it('still covers the pre-existing auth and legal-accept exemptions', () => {
    expect(isForcedLogoutExempt(`${ORIGIN}/api/auth/check-status`)).toBe(true);
    expect(isForcedLogoutExempt(`${ORIGIN}/api/legal/TERMS_AND_CONDITIONS/accept`)).toBe(true);
    expect(isForcedLogoutExempt(`${ORIGIN}/api/legal/TERMS_AND_CONDITIONS`)).toBe(false);
  });
});
