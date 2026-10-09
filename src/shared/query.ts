import { focusManager, MutationCache, QueryClient } from '@tanstack/react-query';
import { isUnconfirmedError } from '@/shared/api/errors';

/**
 * Shared staleTime tiers. Pick the tier that matches how quickly the
 * data goes stale — don't inline new magic numbers in hooks.
 */
export const STALE = {
  DETAIL: 30_000,
  LIST: 60_000,
  LOOKUP: 5 * 60_000,
  LOOKUP_LONG: 10 * 60_000,
  PINNED: Infinity,
} as const;

// Single-flight latch. A screen can fire several mutations at once (or the user
// can tap twice), and every one of them failing on the same dead socket would
// otherwise queue a full active-query refetch each — a storm on the exact
// connection that just proved flaky. One refresh answers all of them.
let unconfirmedRefreshInFlight: Promise<unknown> | null = null;

/**
 * A mutation came back as "unconfirmed" (#26): the request never returned, but
 * the server may well have applied it. We cannot know, so we refetch what is on
 * screen — if the write did land, the user sees their booking/vote/rating
 * appear instead of being told, falsely, that nothing happened.
 *
 * Exported for the test that asserts it is the cache's handler. It never
 * re-runs the mutation; it only reads.
 */
export function handleUnconfirmedMutationError(error: unknown): void {
  if (!isUnconfirmedError(error)) return;
  if (unconfirmedRefreshInFlight) return;
  unconfirmedRefreshInFlight = Promise.resolve(
    queryClient.invalidateQueries({ refetchType: 'active' }),
  )
    .catch(() => {
      // A failed refresh is not worth surfacing — the user already has the
      // honest "we couldn't confirm this" message from the mutation itself.
    })
    .finally(() => {
      unconfirmedRefreshInFlight = null;
    });
}

export const queryClient = new QueryClient({
  mutationCache: new MutationCache({ onError: handleUnconfirmedMutationError }),
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: STALE.DETAIL,
      networkMode: 'always',
    },
    mutations: {
      retry: 0,
    },
  },
});

/** The slice of React Native's `AppState` the focus wiring needs. Injected so
 *  this module (imported by most tests) never pulls in `react-native`. */
export interface AppStateLike {
  addEventListener(type: 'change', listener: (status: string) => void): { remove(): void };
}

let appFocusWired = false;

/**
 * React Native has no window focus, so `refetchOnWindowFocus` is a no-op until
 * TanStack's focusManager is fed AppState: foregrounding the app (`active`)
 * counts as focus. Idempotent; the root layout calls it once with `AppState`.
 */
export function wireAppFocus(appState: AppStateLike): void {
  if (appFocusWired) return;
  appFocusWired = true;
  focusManager.setEventListener((handleFocus) => {
    const subscription = appState.addEventListener('change', (status) => {
      handleFocus(status === 'active');
    });
    return () => subscription.remove();
  });
}
