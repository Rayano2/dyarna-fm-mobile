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
    expect(config.plugins).toContainEqual([
      './plugins/with-localized-app-name',
      expect.objectContaining({ en: 'Dyarna FM Dev', ar: 'مدير ديارنا Dev' }),
    ]);
  });

  it('uses the release application id for the production variant', async () => {
    const config = await loadConfig('production');
    expect(config.android?.package).toBe('com.dyarna.fm');
    expect(config.ios?.bundleIdentifier).toBe('com.dyarna.fm');
    expect(config.name).toBe('Dyarna FM');
    expect(config.slug).toBe('dyarna-fm');
    expect(config.plugins).toContainEqual([
      './plugins/with-localized-app-name',
      expect.objectContaining({ en: 'Dyarna FM', ar: 'مدير ديارنا' }),
    ]);
  });

  it('localizes a generic photo-library prompt (tickets + building documents)', async () => {
    const config = await loadConfig('production');
    const en = config.ios?.infoPlist?.NSPhotoLibraryUsageDescription as string;
    expect(en).toMatch(/tickets/);
    expect(en).toMatch(/building documents/);
    const plugin = config.plugins?.find(
      (p) => Array.isArray(p) && p[0] === './plugins/with-localized-app-name',
    ) as [string, { iosUsage: Record<string, { NSPhotoLibraryUsageDescription: string }> }];
    expect(plugin[1].iosUsage.en?.NSPhotoLibraryUsageDescription).toBe(en);
    expect(plugin[1].iosUsage.ar?.NSPhotoLibraryUsageDescription).toMatch(/مستندات المبنى/);
  });

  it('ships the shell strings in both English and Arabic', () => {
    for (const dict of [en, ar]) {
      expect(dict.fm.nav.dashboard).toBeTruthy();
      expect(dict.fm.login.title).toBeTruthy();
    }
    expect(ar.fm.nav.dashboard).not.toBe(en.fm.nav.dashboard);
  });
});
