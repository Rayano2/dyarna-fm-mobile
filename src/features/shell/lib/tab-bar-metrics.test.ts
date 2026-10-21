import { describe, expect, it } from 'vitest';
import { tabBarBottomPadding, tabBarHeight } from './tab-bar-metrics';

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
