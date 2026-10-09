import { router } from 'expo-router';
import type { FmDestination } from './fm-routes';

/** Performs an `FmDestination`. Kept apart from `fm-routes` so that module
 *  stays free of expo-router and testable under vitest. */
export function goTo(destination: FmDestination): void {
  // typedRoutes: hrefs are built at runtime, same cast the rest of the app uses.
  if (destination.method === 'push') {
    router.push(destination.href as never);
    return;
  }
  router.navigate(destination.href as never);
}
