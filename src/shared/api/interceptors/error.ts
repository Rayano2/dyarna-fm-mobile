import { isTimeoutError, type BeforeErrorHook } from 'ky';
import type { ServiceName } from '../types';
import { normalizeError, ApiError, ERROR_CODES } from '../errors';
import { apiRegistry } from '../registry';
import { i18n } from '@/shared/i18n';

// Module-level latch so N concurrent 401s don't fire N logouts/toasts/navigates.
// `apiRegistry.isAuthenticated` is the source of truth for "do we still need
// to log out?" — once logout completes, further 401s from in-flight requests
// hit the gate and are ignored. The latch resets in `finally`, so a future
// genuine 401 (after re-auth) triggers logout normally.
let logoutInFlight = false;

// Recording a Terms acceptance is the ONE authenticated call whose 401 is not
// a session expiry: the after-login Terms gate promises an inline error and a
// retry, so force-logging out here would eject the user to the login screen
// for tapping the only button the gate offers. Deliberately anchored to
// `/api/legal/<docType>/accept` alone — the exemption must not widen to any
// other endpoint, where a 401 really does mean the session is gone.
const LEGAL_ACCEPT_PATH = /\/api\/legal\/[^/]+\/accept(?:[/?#]|$)/;

// The header bell's unread-count poll is the other 401 that must not end the
// session. It is a DECORATIVE, app-wide, self-refetching query:
// `useUnreadNotificationCount` is mounted in `ShellHeader`, which renders on
// every main tab and every president screen, and it refetches on mount and on
// window focus. So a notifications outage answering 401 would eject the user
// from essentially every screen, on every app foreground, repeatedly — one
// non-critical endpoint taking the whole session down with it. A badge with no
// number is the correct degradation.
// Anchored to `/api/bms/notifications/unread-count` ALONE — deliberately NOT
// the `/notifications` namespace and emphatically not all of `bmsClient`. A
// 401 from the notifications LIST (a screen the user deliberately opened)
// still means the session is gone and still logs out.
// Written as a literal because `shared/` must not import from `features/`;
// `interceptors.test.ts` pins it against `NOTIFICATIONS_UNREAD_COUNT_PATH` so
// the two cannot drift apart.
const NOTIFICATIONS_UNREAD_COUNT_PATH = /\/api\/bms\/notifications\/unread-count(?:[/?#]|$)/;

/**
 * The endpoints whose 401 does NOT mean "this session is over", and which are
 * therefore exempt from the forced logout + toast + redirect above. Every
 * exemption must be justified at its constant; the list stays short.
 *
 * Exported so each exemption can be pinned by a test directly.
 */
export function isForcedLogoutExempt(url: string): boolean {
  return (
    url.includes('/api/auth/') ||
    LEGAL_ACCEPT_PATH.test(url) ||
    NOTIFICATIONS_UNREAD_COUNT_PATH.test(url)
  );
}

export function errorInterceptor(service: ServiceName): BeforeErrorHook {
  return async ({ error, request }) => {
    const response = (error as { response?: Response }).response;
    if (response && response.status === 401) {
      const url = request.url;
      if (!isForcedLogoutExempt(url) && !logoutInFlight && apiRegistry.isAuthenticated()) {
        logoutInFlight = true;
        try {
          await apiRegistry.logout();
          apiRegistry.pushToast({
            variant: 'error',
            title: i18n.t('fm.session.expired'),
          });
          apiRegistry.navigate('/(auth)/login');
        } finally {
          logoutInFlight = false;
        }
      }
    }
    if (response) {
      // ky v2 has already consumed the body into `error.data` (the response
      // stream itself is unreadable here) — hand the parsed body over.
      const preParsedBody = (error as { data?: unknown }).data;
      const apiErr = await normalizeError(response, service, preParsedBody);
      return apiErr as unknown as Error;
    }
    // No response: the request never completed. That is NOT the same thing as
    // "the phone is offline" — a timeout, a reset connection, a TLS or DNS
    // failure and an abort all land here while the device is perfectly online.
    // Reporting all of them as "No connection" was the bug (#18): the user
    // retries immediately, it works, and the message was a lie.
    // Ask netinfo at failure time (rather than reusing a boot-time value) and
    // only claim NETWORK_ERROR when it says so. The `.catch` is defensive: ky
    // does not wrap this hook in a try, so a registration that rejected would
    // propagate raw and cost us the ApiError's code + service in the logs.
    const offline = await apiRegistry.isDeviceOffline().catch(() => false);
    if (offline) {
      return new ApiError({
        code: ERROR_CODES.NETWORK,
        status: 0,
        service,
        message: error.message,
        raw: null,
      }) as unknown as Error;
    }
    return new ApiError({
      // Online but the request didn't finish: distinguish "the server took too
      // long" from "something else broke", so the copy the user sees is honest
      // and points at the right retry.
      code: isTimeoutError(error) ? ERROR_CODES.TIMEOUT : ERROR_CODES.REQUEST_FAILED,
      status: 0,
      service,
      message: error.message,
      raw: null,
    }) as unknown as Error;
  };
}
