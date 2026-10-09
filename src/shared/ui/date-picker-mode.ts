/**
 * Picker mode narrowing for `@react-native-community/datetimepicker`.
 *
 * `'datetime'` is an **iOS-only** mode. The package's Android registry is built
 * from `ANDROID_MODE`, which is only `{ date, time }` — see
 * `node_modules/@react-native-community/datetimepicker/src/constants.js:31-36`:
 *
 *     const COMMON_MODES = Object.freeze({ date: 'date', time: 'time' });
 *     export const ANDROID_MODE = COMMON_MODES;                      // no 'datetime'
 *     export const IOS_MODE = Object.freeze({ ...COMMON_MODES, datetime: ..., countdown: ... });
 *
 * `picker.android.js` keys its `pickers` map off `ANDROID_MODE`, and
 * `DateTimePickerAndroid.android.js` then does `pickers[mode].dismiss()`
 * **unguarded**. With `mode="datetime"` that lookup is `undefined`, so the
 * component's unmount cleanup throws `Cannot read property 'dismiss' of
 * undefined` — which the root ErrorBoundary renders as "Something went wrong".
 * Because it fires on unmount, merely dismissing the picker crashes the screen.
 *
 * TypeScript does not catch this: the package's `index.d.ts` types the component
 * as `FC<IOSNativeProps | AndroidNativeProps | WindowsNativeProps>` — an
 * un-discriminated union — so `mode="datetime"` satisfies the iOS arm on every
 * platform.
 *
 * Narrowing to `'date'` on Android is **behaviour-preserving**: `getOpenPicker`
 * already falls through `'datetime'` to the date picker, so the dialog the user
 * sees is identical. The only change is that the cleanup now indexes a key that
 * actually exists.
 */

/** The modes `DatePickerModal` accepts from callers. */
export type PickerMode = 'date' | 'time' | 'datetime';

/** Mirrors React Native's `Platform.OS` so callers can pass it straight through. */
export type PickerPlatform = 'ios' | 'android' | 'macos' | 'windows' | 'web';

/**
 * Resolve the mode that is actually safe to hand to the native picker.
 *
 * - iOS keeps `'datetime'` — it has a genuine combined picker, so we must not
 *   degrade it.
 * - Every other platform (Android) narrows `'datetime'` to `'date'`, the only
 *   combined-mode fallback its registry knows about.
 * - `'date'` and `'time'` are in `COMMON_MODES` and pass through everywhere.
 */
export function resolvePickerMode(mode: PickerMode, platform: PickerPlatform): PickerMode {
  if (platform === 'ios') return mode;
  return mode === 'datetime' ? 'date' : mode;
}
