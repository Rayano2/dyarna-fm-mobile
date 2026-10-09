import type { AndroidConfig } from '@expo/config-plugins';
import { describe, expect, it } from 'vitest';
import { setLargeHeap } from './with-android-large-heap';

type AndroidManifest = AndroidConfig.Manifest.AndroidManifest;

// Minimal stand-in for the parsed AndroidManifest.xml that `expo prebuild`
// produces. Built here rather than read from android/: that directory is
// gitignored and absent on a fresh clone and in CI.
function manifest(): AndroidManifest {
  return {
    manifest: {
      $: { 'xmlns:android': 'http://schemas.android.com/apk/res/android' },
      queries: [],
      application: [
        {
          $: {
            'android:name': '.MainApplication',
            'android:label': '@string/app_name',
            'android:allowBackup': 'true',
          },
          activity: [],
        },
      ],
    },
  };
}

describe('setLargeHeap', () => {
  it('sets android:largeHeap on the main <application>', () => {
    const result: AndroidManifest = setLargeHeap(manifest());
    expect(result.manifest.application?.[0]?.$['android:largeHeap']).toBe('true');
  });

  it('leaves the other application attributes untouched', () => {
    const result: AndroidManifest = setLargeHeap(manifest());
    const attrs = result.manifest.application?.[0]?.$;
    expect(attrs?.['android:name']).toBe('.MainApplication');
    expect(attrs?.['android:label']).toBe('@string/app_name');
    expect(attrs?.['android:allowBackup']).toBe('true');
  });

  it('is idempotent — re-running prebuild does not change the result', () => {
    const once: AndroidManifest = setLargeHeap(manifest());
    const twice: AndroidManifest = setLargeHeap(once);
    expect(twice).toEqual(once);
  });

  it('throws rather than silently skipping when there is no main application', () => {
    // A silent no-op here would ship the OOM mitigation missing, and the
    // symptom (process death on capture) only shows up on a real high-MP
    // device — far too late to notice.
    const empty = { manifest: { $: {}, application: [] } } as unknown as AndroidManifest;
    expect(() => setLargeHeap(empty)).toThrow();
  });
});
