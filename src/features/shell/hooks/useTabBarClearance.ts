import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUnistyles } from 'react-native-unistyles';
import { tabBarHeight } from '../lib/tab-bar-metrics';

/**
 * Bottom padding a scrollable screen needs so its last item clears the
 * absolutely positioned `TabBar`: the bar's exact height (same constants and
 * safe-area inset the bar itself uses) plus `spacing[16]` of breathing room.
 *
 * Applied as a constant even while the bar is slid away on scroll: the
 * hide offset is an animated shared value, and the extra space only shows
 * at the very end of the list.
 */
export function useTabBarClearance(): number {
  const { theme } = useUnistyles();
  const insets = useSafeAreaInsets();
  return tabBarHeight(insets.bottom, theme.spacing[8]) + theme.spacing[16];
}
