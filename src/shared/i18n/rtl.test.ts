import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DevSettings } from 'react-native';
import * as Updates from 'expo-updates';
import { reloadForRTL } from './rtl';

const updatesState = vi.hoisted(() => ({ enabled: false }));

vi.mock('react-native', () => ({
  I18nManager: { isRTL: false, allowRTL: vi.fn(), forceRTL: vi.fn() },
  DevSettings: { reload: vi.fn() },
}));

vi.mock('expo-updates', () => ({
  get isEnabled() {
    return updatesState.enabled;
  },
  reloadAsync: vi.fn(),
}));

function setDev(value: boolean): void {
  (globalThis as { __DEV__?: boolean }).__DEV__ = value;
}

beforeEach(() => {
  vi.resetAllMocks();
  updatesState.enabled = false;
  setDev(false);
});

afterEach(() => {
  setDev(false);
});

describe('reloadForRTL', () => {
  it('reports false in a release build with expo-updates disabled', async () => {
    // The #34 regression: app.config.ts declares no `updates` key, so
    // ENABLED=false ships and reloadAsync() would reject. The old code
    // swallowed that and resolved silently, so the caller believed a reload
    // was under way and returned early — the language never changed.
    await expect(reloadForRTL()).resolves.toBe(false);
    expect(Updates.reloadAsync).not.toHaveBeenCalled();
  });

  it('reports true when expo-updates reloads', async () => {
    updatesState.enabled = true;
    vi.mocked(Updates.reloadAsync).mockResolvedValue();

    await expect(reloadForRTL()).resolves.toBe(true);
  });

  it('reports false when an enabled reload refuses and there is no dev fallback', async () => {
    updatesState.enabled = true;
    vi.mocked(Updates.reloadAsync).mockRejectedValue(new Error('no update url'));

    await expect(reloadForRTL()).resolves.toBe(false);
  });

  it('falls back to the dev reload in development', async () => {
    setDev(true);

    await expect(reloadForRTL()).resolves.toBe(true);
    expect(DevSettings.reload).toHaveBeenCalledWith('RTL direction changed');
  });
});
