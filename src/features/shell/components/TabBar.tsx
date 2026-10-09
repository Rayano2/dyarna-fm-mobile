import { StyleSheet as RNStyleSheet } from 'react-native';
import type { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { HapticPressable } from '@/shared/ui';
import { useTabBarHide } from '../context/tab-bar-hide';

// Derived from expo-router's Tabs so the app needs no direct
// @react-navigation/bottom-tabs dependency for one type.
type BottomTabBarProps = Parameters<NonNullable<React.ComponentProps<typeof Tabs>['tabBar']>>[0];

export interface TabBarProps extends BottomTabBarProps {
  /**
   * Tab shown as selected while a hidden (`href: null`) route is focused,
   * e.g. 'more' for screens opened from the More list.
   */
  overflowTab?: string;
}

/**
 * Copied from dyarna-rn `src/features/shell/components/TabBar.tsx`.
 * FM changes: skips `href: null` routes, a11y role "tab", 44px minimum target,
 * and the `overflowTab` highlight.
 *
 * Twitter-style bottom tab bar:
 * - Edge-to-edge, no floating card / pill / shadow.
 * - Icons only (labels are kept on the accessibility node so VoiceOver still
 *   reads them).
 * - Active tab: filled icon + primary tint. Inactive: regular weight, muted.
 * - Hides on scroll-down, reveals on scroll-up via the shared `translateY`
 *   from `TabBarHideProvider`.
 */
export function TabBar({ state, descriptors, navigation, overflowTab }: TabBarProps) {
  const { theme } = useUnistyles();
  const insets = useSafeAreaInsets();
  const { translateY } = useTabBarHide();

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  // expo-router renders `href: null` screens with `tabBarItemStyle: {display:'none'}`.
  const isHidden = (key: string): boolean =>
    RNStyleSheet.flatten(descriptors[key]?.options?.tabBarItemStyle)?.display === 'none';
  const focusedRoute = state.routes[state.index];
  const focusedIsHidden = focusedRoute ? isHidden(focusedRoute.key) : false;

  return (
    <Animated.View
      style={[styles.wrapper, animatedStyle, { paddingBottom: Math.max(insets.bottom, 8) }]}
      accessibilityRole="tablist"
    >
      {state.routes.map((route) => {
        if (isHidden(route.key)) return null;
        const { options } = descriptors[route.key] ?? {};
        const label = options?.tabBarLabel ?? options?.title ?? route.name;
        const isFocused = focusedIsHidden
          ? route.name === overflowTab
          : focusedRoute?.key === route.key;

        function onPress() {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (focusedRoute?.key !== route.key && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        }

        return (
          <HapticPressable
            key={route.key}
            onPress={onPress}
            style={styles.tab}
            accessibilityRole="tab"
            accessibilityState={{ selected: isFocused }}
            accessibilityLabel={typeof label === 'string' ? label : undefined}
            testID={`tab-${route.name}`}
            scaleOnPress={1}
          >
            {options?.tabBarIcon?.({
              focused: isFocused,
              color: isFocused ? theme.colors.primary : theme.colors.textMuted,
              size: 26,
            })}
          </HapticPressable>
        );
      })}
    </Animated.View>
  );
}

const styles = StyleSheet.create((theme) => ({
  wrapper: {
    // Absolute so react-navigation hands the full vertical space to the
    // screen content. When `translateY` slides the bar off, the feed shows
    // through where the bar used to sit instead of leaving white space.
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    backgroundColor: theme.colors.bg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderHairline,
    paddingTop: theme.spacing[8],
  },
  tab: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing[8],
  },
}));
