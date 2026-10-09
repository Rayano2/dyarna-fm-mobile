import { afterEach, describe, expect, it, vi } from 'vitest';
import ar from './shared/i18n/translations/ar.json';
import en from './shared/i18n/translations/en.json';

async function loadConfig(variant: string) {
  vi.resetModules();
  vi.stubEnv('EXPO_PUBLIC_APP_VARIANT', variant);
  const mod = await import('../app.config');
  return mod.default;
}

describe('FM app shell', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('uses the dev application id for the development variant', async () => {
    const config = await loadConfig('development');
    expect(config.android?.package).toBe('com.dyarna.fm.dev');
    expect(config.ios?.bundleIdentifier).toBe('com.dyarna.fm.dev');
    expect(config.name).toBe('Dyarna FM Dev');
  });

  it('uses the release application id for the production variant', async () => {
    const config = await loadConfig('production');
    expect(config.android?.package).toBe('com.dyarna.fm');
    expect(config.ios?.bundleIdentifier).toBe('com.dyarna.fm');
    expect(config.name).toBe('Dyarna FM');
    expect(config.slug).toBe('dyarna-fm');
    expect(config.plugins).toContainEqual([
      './plugins/with-localized-app-name',
      { en: 'Dyarna FM', ar: ar.fm.appName },
    ]);
  });

  it('ships the shell strings in both English and Arabic', () => {
    for (const dict of [en, ar]) {
      expect(dict.fm.nav.dashboard).toBeTruthy();
      expect(dict.fm.login.title).toBeTruthy();
    }
    expect(ar.fm.nav.dashboard).not.toBe(en.fm.nav.dashboard);
  });
});
