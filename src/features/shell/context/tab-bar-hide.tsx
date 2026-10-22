import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import {
  runOnJS,
  useAnimatedReaction,
  useAnimatedScrollHandler,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUnistyles } from 'react-native-unistyles';
import { clearanceDelta, isTabBarHidden, tabBarScrollAction } from '../lib/tab-bar-metrics';

// How many vertical pixels the bar slides down to be fully off-screen. Set
// at the height of the bar + safe-area; eyeballed at 80 which covers an
// iPhone home indicator + 60-px-ish bar height without a measurement loop.
const HIDDEN_OFFSET = 80;

interface TabBarHideValue {
  translateY: SharedValue<number>;
  scrollHandler: ReturnType<typeof useAnimatedScrollHandler>;
}

const TabBarHideContext = createContext<TabBarHideValue | null>(null);
// Separate from the shared values so a hide/show flip re-renders only the
// screens reading the clearance, not the bar or every scroll-handler host.
const TabBarHiddenContext = createContext(false);

export function TabBarHideProvider({ children }: { children: ReactNode }) {
  const translateY = useSharedValue(0);
  const lastScrollY = useSharedValue(0);
  const [hidden, setHidden] = useState(false);
  const { theme } = useUnistyles();
  const insets = useSafeAreaInsets();
  const delta = clearanceDelta(insets.bottom, theme.spacing[8]);

  // JS state flips once per transition (not per frame). Reads translateY, so
  // it also follows screens that move the bar directly (ticket detail).
  useAnimatedReaction(
    () => isTabBarHidden(translateY.value, HIDDEN_OFFSET),
    (next, prev) => {
      if (next !== prev) runOnJS(setHidden)(next);
    },
  );

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      const y = event.contentOffset.y;
      const diff = y - lastScrollY.value;
      lastScrollY.value = y;

      const action = tabBarScrollAction({
        y,
        diff,
        contentHeight: event.contentSize.height,
        viewportHeight: event.layoutMeasurement.height,
        delta,
      });
      if (action === 'hide') {
        translateY.value = withTiming(HIDDEN_OFFSET, { duration: 180 });
      } else if (action === 'show') {
        translateY.value = withTiming(0, { duration: 180 });
      }
    },
  });

  const value = useMemo(() => ({ translateY, scrollHandler }), [translateY, scrollHandler]);
  return (
    <TabBarHideContext.Provider value={value}>
      <TabBarHiddenContext.Provider value={hidden}>{children}</TabBarHiddenContext.Provider>
    </TabBarHideContext.Provider>
  );
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

/** Whether the bar is fully slid away; false outside a provider (no bar). */
export function useTabBarHidden(): boolean {
  return useContext(TabBarHiddenContext);
}
