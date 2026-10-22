import { describe, expect, it } from 'vitest';
import {
  isAtScrollEnd,
  isTabBarHidden,
  tabBarBottomPadding,
  tabBarClearance,
  tabBarHeight,
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
