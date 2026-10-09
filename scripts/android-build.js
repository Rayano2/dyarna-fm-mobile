#!/usr/bin/env node
// Variant-consistent Android build: prebuild, gradle and the post-build check
// all run with the same NODE_ENV / EXPO_PUBLIC_APP_VARIANT, so the
// applicationId (from prebuild) and the backend URLs (from the gradle bundle
// step) can never come from different env files.
//
//   node scripts/android-build.js <development|production> [gradleTask]
//   (pnpm android:dev | pnpm android:release [bundleRelease])
//
// gradleTask defaults to assembleRelease (APK). Use bundleRelease for Play.
// Cross-platform: no shell env syntax, works from cmd/PowerShell/bash.
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const variant = process.argv[2];
const gradleTask = process.argv[3] ?? 'assembleRelease';
if (variant !== 'development' && variant !== 'production') {
  console.error('usage: android-build.js <development|production> [gradleTask]');
  process.exit(1);
}

// .env.local / .env.<mode>.local outrank .env.production and have shipped
// Railway URLs inside a "production" build before (dyarna-rn release #54).
if (variant === 'production') {
  for (const f of ['.env.local', '.env.production.local']) {
    if (fs.existsSync(path.join(ROOT, f))) {
      console.error(`[android-build] ${f} exists and would override .env.production. Move it aside first.`);
      process.exit(1);
    }
  }
}

const env = { ...process.env, NODE_ENV: variant, EXPO_PUBLIC_APP_VARIANT: variant };

function run(cmd, args, cwd = ROOT) {
  console.log(`\n[android-build] (${variant}) ${cmd} ${args.join(' ')}`);
  const res = spawnSync(cmd, args, { cwd, env, stdio: 'inherit', shell: process.platform === 'win32' });
  if (res.status !== 0) process.exit(res.status ?? 1);
}

run('npx', ['expo', 'prebuild', '--clean', '--platform', 'android']);

// prebuild --clean wipes android/local.properties; gradle then fails with
// "SDK location not found" unless ANDROID_HOME is exported.
const sdk =
  process.env.ANDROID_HOME ??
  process.env.ANDROID_SDK_ROOT ??
  (process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'Android', 'Sdk') : undefined);
if (sdk && fs.existsSync(sdk)) {
  fs.writeFileSync(
    path.join(ROOT, 'android', 'local.properties'),
    `sdk.dir=${sdk.replaceAll('\', '/')}\n`,
  );
}

run('node', [path.join('scripts', 'check-android-variant.js'), variant]);
run(process.platform === 'win32' ? 'gradlew.bat' : './gradlew', [gradleTask], path.join(ROOT, 'android'));
run('node', [path.join('scripts', 'check-android-variant.js'), variant, '--require-bundle']);
