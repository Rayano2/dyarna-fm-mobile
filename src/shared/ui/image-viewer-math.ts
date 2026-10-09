/**
 * Pure geometry/state helpers for `ImageViewer`.
 *
 * Split out of the component for two reasons:
 *
 * 1. **Testability.** The viewer itself is gestures + a native `Modal` +
 *    Reanimated worklets — none of which this repo can exercise (there are no
 *    render tests and no gesture harness). The arithmetic underneath *can* be
 *    tested, so it lives here and is covered by `image-viewer-math.test.ts`.
 * 2. **Worklet safety.** Every function here is synchronous, allocation-light
 *    and free of closures over React state, so it can be called from the UI
 *    thread inside a gesture handler. Keep it that way — no imports, no
 *    `Date.now()`, no logging, and **no default parameter values**: a default
 *    initialiser is evaluated in the parameter scope, which cannot see the
 *    `__closure` destructuring the Reanimated Babel plugin injects into the
 *    function *body*, so referencing a module constant there throws a
 *    `ReferenceError` on the UI runtime and takes the whole app down with it.
 *    `image-viewer-math.test.ts` guards this.
 */

/** Hard zoom bounds. 1 = fit-to-screen; 4x is where a phone-sized JPEG stops
 *  yielding new detail and starts showing compression artefacts. */
export const MIN_SCALE = 1;
export const MAX_SCALE = 4;

/** Scale the double-tap toggles to. Half-way up the range: enough to read a
 *  meter dial or a receipt line in a ticket photo, not so far in that the user
 *  loses the frame. */
export const DOUBLE_TAP_SCALE = 2.5;

/**
 * Above this, the image counts as zoomed.
 *
 * Not `> 1`: a pinch that ends near the floor leaves a residual like
 * 1.0000001, and `withTiming` back to 1 passes through values fractionally
 * above it. Treating those as "zoomed" would leave the FlatList permanently
 * unscrollable after a pinch-and-release. 1.01 is below the smallest zoom a
 * user can perceive and far above float noise.
 */
export const ZOOM_EPSILON = 1.01;

/** Drag distance (px) past which releasing dismisses the viewer. */
export const DISMISS_DISTANCE = 120;
/** Fling speed (px/s) that dismisses regardless of distance. */
export const DISMISS_VELOCITY = 800;
/** Drag distance at which the scrim would reach fully transparent. */
export const SCRIM_FADE_DISTANCE = 400;

export function clamp(value: number, min: number, max: number): number {
  'worklet';
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

/** Clamp a pinch result into the allowed zoom range. */
export function clampScale(scale: number): number {
  'worklet';
  return clamp(scale, MIN_SCALE, MAX_SCALE);
}

/** True when the image is zoomed in far enough that panning it — rather than
 *  paging the list — should own horizontal movement. */
export function isZoomed(scale: number): boolean {
  'worklet';
  return scale > ZOOM_EPSILON;
}

/**
 * Half the overflow of a scaled image along one axis: the furthest the image
 * may be translated before its edge pulls inside the viewport.
 *
 * At scale <= 1 there is no overflow, so the bound is 0 and the image stays
 * pinned — that is what stops a photo being flung off-screen.
 */
export function maxTranslation(size: number, scale: number): number {
  'worklet';
  const overflow = size * scale - size;
  return overflow > 0 ? overflow / 2 : 0;
}

/** Clamp a pan offset to the image's bounds for the current scale. */
export function clampTranslation(offset: number, size: number, scale: number): number {
  'worklet';
  const bound = maxTranslation(size, scale);
  return clamp(offset, -bound, bound);
}

/** The scale a double-tap should move to from the current one. Any zoom at all
 *  collapses back to fit; fit zooms in. */
export function nextDoubleTapScale(current: number): number {
  'worklet';
  return isZoomed(current) ? MIN_SCALE : DOUBLE_TAP_SCALE;
}

/**
 * Scrim opacity for a vertical drag-to-dismiss offset. Symmetric — dragging
 * up reveals the app behind exactly as dragging down does.
 */
export function scrimOpacity(dy: number): number {
  'worklet';
  const travelled = dy < 0 ? -dy : dy;
  return clamp(1 - travelled / SCRIM_FADE_DISTANCE, 0, 1);
}

/** Whether releasing a drag at this offset/velocity should close the viewer. */
export function shouldDismiss(dy: number, velocityY: number): boolean {
  'worklet';
  const travelled = dy < 0 ? -dy : dy;
  const speed = velocityY < 0 ? -velocityY : velocityY;
  return travelled > DISMISS_DISTANCE || speed > DISMISS_VELOCITY;
}

/**
 * Which page a horizontal `pagingEnabled` list has settled on.
 *
 * Clamped to `[0, count - 1]`: iOS rubber-bands past both ends, which yields a
 * negative offset (index -1) at the start and an offset beyond the last page at
 * the end. An out-of-range index would blank the counter and desync
 * `isActive`, leaving a page stuck zoomed.
 */
export function pageIndexFromOffset(offsetX: number, pageWidth: number, count: number): number {
  'worklet';
  if (count <= 0) return 0;
  if (pageWidth <= 0) return 0;
  const page = Math.round(offsetX / pageWidth);
  // `Math.round` of a small negative (an iOS bounce past page 0) is `-0`, and
  // `clamp` passes it through because `-0 < 0` is false. Normalise it: `-0`
  // compares equal to 0 but is not `Object.is`-equal, which would make any
  // index identity check downstream quietly wrong.
  return clamp(page === 0 ? 0 : page, 0, count - 1);
}

/** Clamp a caller-supplied `initialIndex` so a stale index can't open the
 *  viewer scrolled to a page that doesn't exist. */
export function clampIndex(index: number, count: number): number {
  if (count <= 0) return 0;
  if (!Number.isFinite(index)) return 0;
  return clamp(Math.round(index), 0, count - 1);
}

/**
 * The 1-based numbers shown in the counter and announced by the screen reader.
 * Kept as data rather than a formatted string so the actual formatting stays in
 * i18n (`imageViewer.counter` = "{{current}} / {{total}}"), where Arabic can
 * diverge if it ever needs to.
 */
export function counterValues(index: number, total: number): { current: number; total: number } {
  return { current: clampIndex(index, total) + 1, total };
}
