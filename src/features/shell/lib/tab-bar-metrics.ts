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
