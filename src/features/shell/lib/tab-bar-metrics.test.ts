import { describe, expect, it } from 'vitest';
import {
  clearanceDelta,
  isAtScrollEnd,
  isTabBarHidden,
  tabBarBottomPadding,
  tabBarClearance,
  tabBarHeight,
  tabBarScrollAction,
} from './tab-bar-metrics';

describe('tab bar metrics', () => {
  it('uses the minimum bottom padding on devices without a bottom inset', () => {
    expect(tabBarBottomPadding(0)).toBe(8);
    expect(tabBarHeight(0, 8)).toBe(8 + 44 + 1 + 8);
  });

  it('grows with the home-indicator inset (the old 96px fell short here)', () => {
    expect(tabBarBottomPadding(34)).toBe(34);
    expect(tabBarHeight(34, 8)).toBe(87);
    // + spacing[16] of breathing room = 103 > the old hard-coded 96.
    expect(tabBarHeight(48, 8) + 16).toBeGreaterThan(96);
  });
});

describe('tab bar clearance (FM #110 retest)', () => {
  it('is the bar height + gap while the bar is shown', () => {
    expect(tabBarClearance(24, 8, 16, false)).toBe(tabBarHeight(24, 8) + 16);
  });

  it('drops to the safe-area inset + gap once the bar has slid away', () => {
    expect(tabBarClearance(24, 8, 16, true)).toBe(40);
    expect(tabBarClearance(0, 8, 16, true)).toBe(16);
    expect(tabBarClearance(24, 8, 16, true)).toBeLessThan(tabBarClearance(24, 8, 16, false));
  });

  it('counts the bar hidden only when fully off, so showing restores clearance at once', () => {
    expect(isTabBarHidden(0, 80)).toBe(false);
    expect(isTabBarHidden(40, 80)).toBe(false);
    expect(isTabBarHidden(79.9, 80)).toBe(false);
    expect(isTabBarHidden(80, 80)).toBe(true);
    // Ticket detail pushes it further off.
    expect(isTabBarHidden(160, 80)).toBe(true);
  });

  it('recognises an offset pinned at the end (clamp / bounce), not a scroll-up', () => {
    expect(isAtScrollEnd(1000, 1800, 800)).toBe(true);
    expect(isAtScrollEnd(1020, 1800, 800)).toBe(true);
    expect(isAtScrollEnd(990, 1800, 800)).toBe(false);
  });
});

describe('tabBarScrollAction (W2: no hide/show flicker on short lists)', () => {
  const delta = clearanceDelta(24, 8); // 8 + 44 + 1 + 24 - 24 = 53
  const VIEW = 800;
  const at = (y: number, diff: number, contentHeight: number) =>
    tabBarScrollAction({ y, diff, contentHeight, viewportHeight: VIEW, delta });

  it('is the clearance shrink when the bar hides', () => {
    expect(delta).toBe(53);
    expect(tabBarClearance(24, 8, 16, false) - tabBarClearance(24, 8, 16, true)).toBe(delta);
  });

  it('hides on a scroll down on a long list', () => {
    expect(at(300, 20, 3000)).toBe('hide');
  });

  it('does not hide near the top', () => {
    expect(at(40, 20, 3000)).toBeNull();
  });

  it('never hides a list that can scroll by only MIN + delta or less (the flicker case)', () => {
    // Range 100 <= 50 + 53: hiding would shrink it under 50 and clamp to the top.
    expect(at(80, 20, VIEW + 100)).toBeNull();
    expect(at(80, 20, VIEW + 50 + 53)).toBeNull();
    expect(at(80, 20, VIEW + 50 + 54)).toBe('hide');
  });

  it('shows at the top and on a real scroll up', () => {
    expect(at(0, -20, 3000)).toBe('show');
    expect(at(-10, -5, VIEW + 20)).toBe('show');
    expect(at(500, -20, 3000)).toBe('show');
  });

  it('ignores wiggles and the end-of-list clamp', () => {
    expect(at(500, 2, 3000)).toBeNull();
    expect(at(500, -3, 3000)).toBeNull();
    // Offset pinned at max (3000 - 800) after the content shrank.
    expect(at(2200, -53, 3000)).toBeNull();
  });
});
