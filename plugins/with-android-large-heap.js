const { AndroidConfig, withAndroidManifest } = require('@expo/config-plugins');

// Android-only: raise the process heap ceiling by setting
// `android:largeHeap="true"` on <application>.
//
// Why this exists (#35 — camera capture kills the app):
// expo-image-picker takes a compression branch for ANY `quality` < 1.0. That
// branch decodes the captured file into a single full-size Bitmap with no
// downsampling before re-encoding it. A modern phone camera shoots 50 MP, and
// ARGB_8888 costs 4 bytes per pixel, so the decode alone asks for ~200 MB in
// one contiguous allocation — on top of the memory React Native, Hermes and
// Fabric are already holding. On a default (non-large) heap the process is
// killed outright: not a JS error, not a redbox, but process death, which the
// user sees as the app "restarting" back to the splash screen.
//
// `largeHeap` roughly doubles the per-process limit on most OEM builds (the
// exact value is device-specific — `ActivityManager.getLargeMemoryClass()`).
//
// IMPORTANT — this is a mitigation, NOT the fix, and must not be mistaken for
// one:
//  * `largeHeap` only raises a ceiling. A big enough capture still OOMs, and
//    a heap that large also means longer GC pauses for every user, all the
//    time. Google explicitly discourages using it to paper over allocation
//    behaviour.
//  * The actual fix is to stop the oversized decode from happening: capture at
//    `quality: 1` (which routes to the raw-copy exporter and never builds a
//    Bitmap) and then downscale the returned asset with expo-image-manipulator.
//    That is NOT done yet — expo-image-manipulator is not a dependency of this
//    app, and adding a native module is a build-story decision that was left
//    to a human. Until it lands, this plugin plus the pending-result recovery
//    in ImagePickerRow are what stand between a 50 MP capture and process
//    death.
//  * So do not delete this once the downscale ships without re-testing on a
//    real high-megapixel handset — but do revisit it, because it should stop
//    being load-bearing at that point.
//
// iOS is unaffected: it has no equivalent manifest flag and its memory model
// is different. `android/` is gitignored, so this plugin is the only source of
// truth for the attribute — editing the generated manifest by hand would be
// erased by the next prebuild.

// Pure object -> object so it can be unit-tested against a fixture without
// running prebuild.
function setLargeHeap(androidManifest) {
  const application = AndroidConfig.Manifest.getMainApplicationOrThrow(androidManifest);
  // Idempotent by construction: assigning the same value on a re-run is a
  // no-op, so this is safe on every prebuild over an existing android/.
  application.$['android:largeHeap'] = 'true';
  return androidManifest;
}

module.exports = function withAndroidLargeHeap(config) {
  return withAndroidManifest(config, (cfg) => {
    cfg.modResults = setLargeHeap(cfg.modResults);
    return cfg;
  });
};

// Exported for plugins/with-android-large-heap.test.ts only — the plugin
// itself stays the module's default export.
module.exports.setLargeHeap = setLargeHeap;
