import { createContext, useContext, useMemo, type ReactNode } from 'react';
import {
  useAnimatedScrollHandler,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

// How many vertical pixels the bar slides down to be fully off-screen. Set
// at the height of the bar + safe-area; eyeballed at 80 which covers an
// iPhone home indicator + 60-px-ish bar height without a measurement loop.
const HIDDEN_OFFSET = 80;

// Don't hide on tiny scroll wiggles or while still near the top of the list
// (the user is "settling" the feed at this point, not committing to scroll).
const MIN_SCROLL_TO_HIDE = 50;
const SCROLL_DELTA_THRESHOLD = 4;

interface TabBarHideValue {
  translateY: SharedValue<number>;
  scrollHandler: ReturnType<typeof useAnimatedScrollHandler>;
}

const TabBarHideContext = createContext<TabBarHideValue | null>(null);

export function TabBarHideProvider({ children }: { children: ReactNode }) {
  const translateY = useSharedValue(0);
  const lastScrollY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      const y = event.contentOffset.y;
      const diff = y - lastScrollY.value;
      lastScrollY.value = y;

      // At the very top of the list, always show — protects against the
      // bar staying hidden after pull-to-refresh.
      if (y <= 0) {
        translateY.value = withTiming(0, { duration: 180 });
        return;
      }
      if (Math.abs(diff) < SCROLL_DELTA_THRESHOLD) return;
      if (diff > 0 && y > MIN_SCROLL_TO_HIDE) {
        translateY.value = withTiming(HIDDEN_OFFSET, { duration: 180 });
      } else if (diff < 0) {
        translateY.value = withTiming(0, { duration: 180 });
      }
    },
  });

  const value = useMemo(() => ({ translateY, scrollHandler }), [translateY, scrollHandler]);
  return <TabBarHideContext.Provider value={value}>{children}</TabBarHideContext.Provider>;
}

export function useTabBarHide(): TabBarHideValue {
  const ctx = useContext(TabBarHideContext);
  if (!ctx) {
    throw new Error('useTabBarHide must be used within a TabBarHideProvider');
  }
  return ctx;
}

/**
 * Same as `useTabBarHide` but returns null instead of throwing when no
 * provider is present — for components reused both inside the bottom-tab
 * group and as standalone stack screens (e.g. `TicketList`).
 */
export function useOptionalTabBarHide(): TabBarHideValue | null {
  return useContext(TabBarHideContext);
}
