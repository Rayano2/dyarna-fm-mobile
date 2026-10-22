import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUnistyles } from 'react-native-unistyles';
import { useTabBarHidden } from '../context/tab-bar-hide';
import { tabBarClearance } from '../lib/tab-bar-metrics';

/**
 * Bottom padding a scrollable screen needs so its last item clears the
 * absolutely positioned `TabBar`: the bar's exact height (same constants and
 * safe-area inset the bar itself uses) plus `spacing[16]` of breathing room.
 *
 * Follows the bar's hide state: once the bar has slid away on scroll it drops
 * to the safe-area inset + `spacing[16]` (FM #110 retest — a constant left a
 * blank band at the end of every scrolled list). Re-renders only on the
 * hide/show transition, not per frame.
 */
export function useTabBarClearance(): number {
  const { theme } = useUnistyles();
  const insets = useSafeAreaInsets();
  const hidden = useTabBarHidden();
  return tabBarClearance(insets.bottom, theme.spacing[8], theme.spacing[16], hidden);
}
