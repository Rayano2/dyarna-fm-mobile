import { describe, expect, it, vi, beforeEach } from 'vitest';

describe('env validation', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it('validates all required env vars and exports ENV', async () => {
    vi.stubEnv('EXPO_PUBLIC_UMS_BASE_URL', 'https://ums.example.com');
    vi.stubEnv('EXPO_PUBLIC_BMS_BASE_URL', 'https://bms.example.com');
    vi.stubEnv('EXPO_PUBLIC_TMS_BASE_URL', 'https://tms.example.com');
    vi.stubEnv('EXPO_PUBLIC_COMMUNITY_BASE_URL', 'https://community.example.com');
    vi.stubEnv('EXPO_PUBLIC_ENV', 'development');
    vi.stubEnv('EXPO_PUBLIC_API_TIMEOUT', '30000');
    vi.stubEnv('EXPO_PUBLIC_DEEP_LINK_SCHEME', 'dyarnafm-dev');
    vi.stubEnv('EXPO_PUBLIC_APP_VARIANT', 'development');

    const { ENV } = await import('./env');
    expect(ENV.UMS_BASE_URL).toBe('https://ums.example.com');
    expect(ENV.API_TIMEOUT).toBe(30_000);
    expect(ENV.ENV).toBe('development');
    expect(ENV.APP_VARIANT).toBe('development');
    expect(ENV.DEEP_LINK_SCHEME).toBe('dyarnafm-dev');
  });

  it('throws on missing required vars', async () => {
    vi.stubEnv('EXPO_PUBLIC_UMS_BASE_URL', '');
    await expect(import('./env')).rejects.toThrow(/UMS_BASE_URL/);
  });
});
