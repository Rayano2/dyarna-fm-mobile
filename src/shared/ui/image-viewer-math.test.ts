import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  DISMISS_DISTANCE,
  DISMISS_VELOCITY,
  DOUBLE_TAP_SCALE,
  MAX_SCALE,
  MIN_SCALE,
  ZOOM_EPSILON,
  clampIndex,
  clampScale,
  clampTranslation,
  counterValues,
  isZoomed,
  maxTranslation,
  nextDoubleTapScale,
  pageIndexFromOffset,
  scrimOpacity,
  shouldDismiss,
} from './image-viewer-math';

/**
 * SCOPE: this file covers the pure arithmetic behind `ImageViewer` only.
 * The gestures (pinch / double-tap / pan / drag-to-dismiss), the native
 * `Modal`, and RTL paging of the horizontal FlatList are NOT covered — this
 * repo has no render tests and no gesture harness, and RTL paging depends on
 * platform behaviour that only an emulator can settle. Those need a manual
 * pass on iOS + Android in both locales.
 */

describe('clampScale', () => {
  it('holds the pinch inside the allowed zoom range', () => {
    expect(clampScale(0.2)).toBe(MIN_SCALE);
    expect(clampScale(9)).toBe(MAX_SCALE);
    expect(clampScale(2.5)).toBe(2.5);
  });
});

describe('isZoomed', () => {
  it('is false at rest', () => {
    expect(isZoomed(1)).toBe(false);
  });

  it('ignores float residue just above 1 so the list stays scrollable', () => {
    // A pinch released at the floor settles a hair above 1. Treating that as
    // zoomed would leave `scrollEnabled={false}` forever and the user could
    // never page again.
    expect(isZoomed(1.000_000_1)).toBe(false);
    expect(isZoomed(ZOOM_EPSILON)).toBe(false);
  });

  it('is true for a zoom the user can actually see', () => {
    expect(isZoomed(1.05)).toBe(true);
    expect(isZoomed(MAX_SCALE)).toBe(true);
  });
});

describe('nextDoubleTapScale', () => {
  it('toggles fit <-> 2.5x', () => {
    expect(nextDoubleTapScale(1)).toBe(DOUBLE_TAP_SCALE);
    expect(nextDoubleTapScale(DOUBLE_TAP_SCALE)).toBe(MIN_SCALE);
  });

  it('collapses to fit from any zoom level, not just the double-tap one', () => {
    expect(nextDoubleTapScale(4)).toBe(MIN_SCALE);
    expect(nextDoubleTapScale(1.3)).toBe(MIN_SCALE);
  });
});

describe('maxTranslation / clampTranslation', () => {
  it('allows no movement while the image fits the viewport', () => {
    expect(maxTranslation(390, 1)).toBe(0);
    expect(maxTranslation(390, 0.8)).toBe(0);
    expect(clampTranslation(500, 390, 1)).toBe(0);
  });

  it('allows exactly half the overflow in each direction', () => {
    // 390 wide at 2x = 780; 390 of overflow, 195 hidden on each side.
    expect(maxTranslation(390, 2)).toBe(195);
    expect(clampTranslation(1000, 390, 2)).toBe(195);
    expect(clampTranslation(-1000, 390, 2)).toBe(-195);
    expect(clampTranslation(40, 390, 2)).toBe(40);
  });
});

describe('scrimOpacity', () => {
  it('is opaque at rest and fades symmetrically in both drag directions', () => {
    expect(scrimOpacity(0)).toBe(1);
    expect(scrimOpacity(200)).toBeCloseTo(0.5);
    expect(scrimOpacity(-200)).toBeCloseTo(0.5);
  });

  it('never goes below 0 on a long drag', () => {
    expect(scrimOpacity(5000)).toBe(0);
  });
});

describe('shouldDismiss', () => {
  it('keeps the viewer open for a short, slow drag', () => {
    expect(shouldDismiss(40, 100)).toBe(false);
    expect(shouldDismiss(DISMISS_DISTANCE, 0)).toBe(false);
  });

  it('dismisses on a long drag regardless of speed', () => {
    expect(shouldDismiss(DISMISS_DISTANCE + 1, 0)).toBe(true);
    expect(shouldDismiss(-(DISMISS_DISTANCE + 1), 0)).toBe(true);
  });

  it('dismisses on a fast flick even when barely moved', () => {
    expect(shouldDismiss(20, DISMISS_VELOCITY + 1)).toBe(true);
    expect(shouldDismiss(-20, -(DISMISS_VELOCITY + 1))).toBe(true);
  });
});

describe('pageIndexFromOffset', () => {
  const WIDTH = 390;

  it('maps a settled offset to its page', () => {
    expect(pageIndexFromOffset(0, WIDTH, 7)).toBe(0);
    expect(pageIndexFromOffset(WIDTH * 3, WIDTH, 7)).toBe(3);
  });

  it('rounds a partly-settled offset to the nearest page', () => {
    expect(pageIndexFromOffset(WIDTH * 2 + 10, WIDTH, 7)).toBe(2);
    expect(pageIndexFromOffset(WIDTH * 2 - 10, WIDTH, 7)).toBe(2);
  });

  it('clamps iOS rubber-banding past either end', () => {
    // Bouncing past page 0 yields a negative offset; past the last page an
    // offset beyond the content. Either would blank the counter and desync
    // `isActive`, leaving the page the user returns to still zoomed.
    expect(pageIndexFromOffset(-120, WIDTH, 7)).toBe(0);
    expect(pageIndexFromOffset(WIDTH * 9, WIDTH, 7)).toBe(6);
  });

  it('is safe before layout has produced a width', () => {
    expect(pageIndexFromOffset(0, 0, 7)).toBe(0);
    expect(pageIndexFromOffset(100, WIDTH, 0)).toBe(0);
  });
});

describe('clampIndex', () => {
  it('keeps a valid index', () => {
    expect(clampIndex(3, 7)).toBe(3);
  });

  it('clamps a stale index instead of opening on a page that does not exist', () => {
    expect(clampIndex(12, 3)).toBe(2);
    expect(clampIndex(-4, 3)).toBe(0);
  });

  it('survives junk input', () => {
    expect(clampIndex(Number.NaN, 3)).toBe(0);
    expect(clampIndex(1, 0)).toBe(0);
  });
});

describe('counterValues', () => {
  it('presents 1-based numbers for "3 / 7"', () => {
    expect(counterValues(2, 7)).toEqual({ current: 3, total: 7 });
    expect(counterValues(0, 7)).toEqual({ current: 1, total: 7 });
    expect(counterValues(6, 7)).toEqual({ current: 7, total: 7 });
  });

  it('never announces a page beyond the total', () => {
    expect(counterValues(99, 4)).toEqual({ current: 4, total: 4 });
  });
});

/**
 * Regression guard for the black-screen crash in Rayano2/dyarna-mobile#39:
 * three worklets in this module declared default parameters that referenced
 * module constants (`scrimOpacity(dy, fadeDistance = SCRIM_FADE_DISTANCE)`).
 * A default initialiser is evaluated in the *parameter* scope, which cannot
 * see the `const { … } = this.__closure` line the Reanimated Babel plugin
 * injects into the function *body* — so on the UI runtime the constant did not
 * exist, Hermes threw a ReferenceError, and React Native tore down the whole
 * host. Tapping a ticket attachment left the user on a dead black screen.
 *
 * Vitest cannot reproduce the failure itself (it bundles through esbuild with
 * no Babel, so the Reanimated plugin never runs and the constants resolve as
 * ordinary module bindings). What it *can* do is assert the source-level
 * invariant that was violated — hence a text assertion rather than a call.
 * Do not delete this because it looks like it tests nothing.
 */
describe('worklet source constraints', () => {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const source = readFileSync(path.join(here, 'image-viewer-math.ts'), 'utf8');
  // `function name(params): Type {` immediately followed by the directive.
  const WORKLET = /function\s+(\w+)\s*\(([^)]*)\)\s*:[^{]*\{\s*'worklet';/g;

  it('declares no default parameter values in a worklet', () => {
    const matches = [...source.matchAll(WORKLET)];
    // If this ever drifts, the regex stopped matching real worklets and the
    // check below would pass vacuously.
    expect(matches.length).toBe(source.match(/'worklet';/g)?.length ?? 0);

    const offenders = matches.filter((m) => /=(?!>)/.test(m[2] ?? '')).map((m) => m[1]);
    expect(offenders).toEqual([]);
  });
});
