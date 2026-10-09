import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// The build scripts and config plugins are plain Node files that nothing else
// in the gates loads (tsc and eslint skip them). A syntax error in one only
// showed up when a release build was attempted, so parse every one here.
const ROOT = path.resolve(__dirname, '..');
const files = ['scripts', 'plugins'].flatMap((dir) =>
  readdirSync(path.join(ROOT, dir))
    .filter((name) => name.endsWith('.js'))
    .map((name) => path.join(dir, name)),
);

describe('node scripts and config plugins', () => {
  it('finds the build scripts', () => {
    expect(files).toContain(path.join('scripts', 'android-build.js'));
    expect(files).toContain(path.join('scripts', 'check-android-variant.js'));
  });

  it.each(files)('%s parses', (file) => {
    expect(() =>
      execFileSync(process.execPath, ['--check', path.join(ROOT, file)], { stdio: 'pipe' }),
    ).not.toThrow();
  });
});
