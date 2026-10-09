import { describe, expect, it } from 'vitest';
import { resolvePickerMode, type PickerMode, type PickerPlatform } from './date-picker-mode';

/**
 * Mirrors `ANDROID_MODE` in
 * `node_modules/@react-native-community/datetimepicker/src/constants.js:31-36`
 * (`COMMON_MODES = { date, time }`). Anything outside this set has no entry in
 * the Android `pickers` registry, so the component's unmount cleanup
 * (`pickers[mode].dismiss()`) throws into the root ErrorBoundary.
 */
const ANDROID_PICKER_MODES = ['date', 'time'] as const;

/**
 * Every mode `DatePickerModal` accepts. The `satisfies` keeps this exhaustive:
 * widening `PickerMode` without adding it here is a compile error, so the
 * invariant below can never silently skip a mode.
 */
const ALL_MODES = Object.keys({
  date: true,
  time: true,
  datetime: true,
} satisfies Record<PickerMode, true>) as PickerMode[];

describe('resolvePickerMode', () => {
  it("narrows 'datetime' to 'date' on Android", () => {
    // 'datetime' is iOS-only; on Android it is the crash (issue #8).
    expect(resolvePickerMode('datetime', 'android')).toBe('date');
  });

  it("keeps 'datetime' on iOS", () => {
    // iOS has a genuine combined picker — the fix must not degrade it.
    expect(resolvePickerMode('datetime', 'ios')).toBe('datetime');
  });

  it.each<PickerPlatform>(['ios', 'android'])(
    "passes 'date' and 'time' through on %s",
    (platform) => {
      expect(resolvePickerMode('date', platform)).toBe('date');
      expect(resolvePickerMode('time', platform)).toBe('time');
    },
  );

  it('only ever yields a mode the Android picker registry knows', () => {
    // The invariant that catches the whole bug class: no accepted mode may
    // resolve to a key that is missing from ANDROID_MODE.
    for (const mode of ALL_MODES) {
      expect(ANDROID_PICKER_MODES).toContain(resolvePickerMode(mode, 'android'));
    }
  });
});
