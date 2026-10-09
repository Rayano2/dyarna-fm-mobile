#!/usr/bin/env node
// Fails unless the generated android/ project (and, when present, the built JS
// bundle) belongs to the intended variant.
//
//   node scripts/check-android-variant.js <development|production> [--require-bundle]
//
// Why: `expo prebuild` and the gradle bundle step each pick their env file from
// NODE_ENV independently. If they disagree you get e.g. the prod backend inside
// the com.dyarna.fm.dev package, and the first Play upload permanently claims
// the wrong applicationId. This is the last line of defence before upload.
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const EXPECTED_ID = { development: 'com.dyarna.fm.dev', production: 'com.dyarna.fm' };

function fail(msg) {
  console.error(`[check-android-variant] FAIL: ${msg}`);
  process.exit(1);
}

function readEnvVar(file, name) {
  const p = path.join(ROOT, file);
  if (!fs.existsSync(p)) return null;
  const line = fs
    .readFileSync(p, 'utf8')
    .split(/\r?\n/)
    .find((l) => l.startsWith(`${name}=`));
  return line ? line.slice(name.length + 1).trim() : null;
}

function findBundles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) findBundles(full, out);
    else if (entry.name === 'index.android.bundle') out.push(full);
  }
  return out;
}

const variant = process.argv[2];
const requireBundle = process.argv.includes('--require-bundle');
if (!(variant in EXPECTED_ID)) fail(`usage: check-android-variant.js <development|production>`);

// 1. applicationId written by prebuild.
const gradlePath = path.join(ROOT, 'android', 'app', 'build.gradle');
if (!fs.existsSync(gradlePath)) fail(`${gradlePath} not found; run prebuild first`);
const match = fs.readFileSync(gradlePath, 'utf8').match(/applicationId\s+['"]([^'"]+)['"]/);
if (!match) fail('no applicationId found in android/app/build.gradle');
const actualId = match[1];
if (actualId !== EXPECTED_ID[variant]) {
  fail(
    `android/ was generated for applicationId ${actualId}, expected ${EXPECTED_ID[variant]} ` +
      `(${variant}). Re-run prebuild with NODE_ENV=${variant} (pnpm android:${variant === 'production' ? 'release' : 'dev'}).`,
  );
}
console.log(`[check-android-variant] applicationId ${actualId} OK`);

// 2. Backend host embedded in the JS bundle (Hermes keeps string literals readable).
const bundles = findBundles(path.join(ROOT, 'android', 'app', 'build', 'generated'));
if (bundles.length === 0) {
  if (requireBundle) fail('no index.android.bundle under android/app/build/generated');
  console.log('[check-android-variant] no JS bundle built yet; host check skipped');
  process.exit(0);
}
const envFile = variant === 'production' ? '.env.production' : '.env.development';
const expectedUrl = readEnvVar(envFile, 'EXPO_PUBLIC_UMS_BASE_URL');
if (!expectedUrl) fail(`EXPO_PUBLIC_UMS_BASE_URL missing from ${envFile}`);
const expectedHost = new URL(expectedUrl).host;
for (const bundle of bundles) {
  const text = fs.readFileSync(bundle).toString('latin1');
  if (!text.includes(expectedHost)) {
    fail(`${path.relative(ROOT, bundle)} does not embed ${expectedHost} (from ${envFile})`);
  }
  if (variant === 'production' && text.includes('up.railway.app')) {
    fail(`${path.relative(ROOT, bundle)} embeds a Railway URL in a production build`);
  }
  console.log(`[check-android-variant] ${path.relative(ROOT, bundle)} embeds ${expectedHost} OK`);
}
