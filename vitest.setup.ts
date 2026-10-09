import { vi } from 'vitest';

// __DEV__ is injected by Metro at build time but not by vitest. Logger guards
// on it; without a value, any test path that hits logger.warn throws.
(globalThis as { __DEV__?: boolean }).__DEV__ = false;

// env.ts validates at module import; tests that import any API module would
// crash without these. Real env.test.ts resets via vi.unstubAllEnvs/resetModules.
vi.stubEnv('EXPO_PUBLIC_UMS_BASE_URL', 'https://ums.test.local');
vi.stubEnv('EXPO_PUBLIC_BMS_BASE_URL', 'https://bms.test.local');
vi.stubEnv('EXPO_PUBLIC_TMS_BASE_URL', 'https://tms.test.local');
vi.stubEnv('EXPO_PUBLIC_COMMUNITY_BASE_URL', 'https://community.test.local');
vi.stubEnv('EXPO_PUBLIC_ENV', 'development');
vi.stubEnv('EXPO_PUBLIC_API_TIMEOUT', '30000');
vi.stubEnv('EXPO_PUBLIC_DEEP_LINK_SCHEME', 'dyarnafm-dev');
vi.stubEnv('EXPO_PUBLIC_APP_VARIANT', 'development');
