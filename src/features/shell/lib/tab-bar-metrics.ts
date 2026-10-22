/**
 * Layout constants shared by `TabBar` and `useTabBarClearance`, so the
 * clearance screens add under the absolutely positioned bar is computed from
 * the bar's real dimensions instead of a hard-coded guess (FM #110 item 1).
 */

/** Minimum height of one tab (44px touch target). */
export const TAB_MIN_HEIGHT = 44;
/** Top hairline border of the bar. */
export const TAB_BAR_BORDER_TOP = 1;
/** Bottom padding when the device reports no (or a tiny) bottom inset. */
export const TAB_BAR_MIN_BOTTOM_PADDING = 8;

/** Bottom padding the bar applies: the safe-area inset, at least the minimum. */
export function tabBarBottomPadding(insetBottom: number): number {
  return Math.max(insetBottom, TAB_BAR_MIN_BOTTOM_PADDING);
}

/**
 * Total rendered height of the bar: top padding + tab + border + bottom padding.
 * `paddingTop` is the theme spacing the bar uses (`theme.spacing[8]`).
 */
export function tabBarHeight(insetBottom: number, paddingTop: number): number {
  return paddingTop + TAB_MIN_HEIGHT + TAB_BAR_BORDER_TOP + tabBarBottomPadding(insetBottom);
}

/**
 * Bottom padding a screen under the tab bar needs (FM #110 retest): the bar's
 * height + `gap` while it is shown; only the safe-area inset + `gap` once it
 * has slid away, so a list's end does not sit on an empty band where the bar was.
 */
export function tabBarClearance(
  insetBottom: number,
  paddingTop: number,
  gap: number,
  hidden: boolean,
): number {
  return (hidden ? insetBottom : tabBarHeight(insetBottom, paddingTop)) + gap;
}

/**
 * Whether the bar counts as hidden for clearance: only once it is fully off
 * (`translateY >= hiddenOffset`). The moment it starts sliding back in, the
 * clearance returns, so content is never left under a reappearing bar.
 */
export function isTabBarHidden(translateY: number, hiddenOffset: number): boolean {
  'worklet';
  return translateY >= hiddenOffset;
}

/**
 * A scroll event at the very end of the content (offset at its maximum) is
 * the list clamping after its content shrank — e.g. the clearance dropping as
 * the bar hides — or an end-of-list bounce, never a user scrolling up. Treating
 * it as "scroll up" would re-show the bar and loop hide/show.
 */
export function isAtScrollEnd(
  offsetY: number,
  contentHeight: number,
  viewportHeight: number,
): boolean {
  'worklet';
  return offsetY >= contentHeight - viewportHeight - 1;
}
