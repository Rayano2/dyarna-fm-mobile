import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Alert } from 'react-native';
import { secureStorage } from '@/shared/lib/storage';
import { changeI18nLocale } from '../i18n';
import { applyRTLIfNeeded, reloadForRTL } from '../i18n/rtl';
import { useLocaleStore } from './localeStore';

vi.mock('react-native', () => ({ Alert: { alert: vi.fn() } }));

vi.mock('expo-localization', () => ({
  getLocales: vi.fn(() => [{ languageCode: 'ar' }]),
}));

vi.mock('@/shared/lib/storage', () => ({
  secureStorage: { getString: vi.fn(), setString: vi.fn() },
}));

vi.mock('../i18n', () => ({
  initI18n: vi.fn(),
  changeI18nLocale: vi.fn(),
  i18n: { t: (key: string) => key },
}));

vi.mock('../i18n/rtl', () => ({
  applyRTLIfNeeded: vi.fn(),
  reloadForRTL: vi.fn(),
  isRTLLocale: (locale: string) => locale === 'ar',
}));

const stored: Record<string, string | null> = {};

beforeEach(() => {
  vi.resetAllMocks();
  for (const key of Object.keys(stored)) delete stored[key];
  vi.mocked(secureStorage.getString).mockImplementation(async (key) => stored[key] ?? null);
  vi.mocked(secureStorage.setString).mockImplementation(async (key, value) => {
    stored[key] = value;
  });
  vi.mocked(changeI18nLocale).mockResolvedValue();
  useLocaleStore.setState({ locale: 'en', hydrated: false });
});

describe('setLocale', () => {
  it('defers everything to the reload when one is under way', async () => {
    // The TestFlight crash guard: with a reload pending, touching i18n or
    // store state re-renders a tree that is being torn down.
    vi.mocked(applyRTLIfNeeded).mockResolvedValue(true);
    vi.mocked(reloadForRTL).mockResolvedValue(true);

    await useLocaleStore.getState().setLocale('ar');

    expect(changeI18nLocale).not.toHaveBeenCalled();
    expect(useLocaleStore.getState().locale).toBe('en');
    expect(Alert.alert).not.toHaveBeenCalled();
    expect(stored['dyarna.locale']).toBe('ar');
  });

  it('applies the locale in-process and prompts when no reload is available', async () => {
    // #34: release builds have no reload, so returning early left the app
    // fully in English and snapped the toggle back.
    vi.mocked(applyRTLIfNeeded).mockResolvedValue(true);
    vi.mocked(reloadForRTL).mockResolvedValue(false);

    await useLocaleStore.getState().setLocale('ar');

    expect(changeI18nLocale).toHaveBeenCalledWith('ar');
    expect(useLocaleStore.getState().locale).toBe('ar');
    expect(Alert.alert).toHaveBeenCalledTimes(1);
  });

  it('swaps in-process without a prompt when the direction does not change', async () => {
    vi.mocked(applyRTLIfNeeded).mockResolvedValue(false);

    await useLocaleStore.getState().setLocale('ar');

    expect(reloadForRTL).not.toHaveBeenCalled();
    expect(useLocaleStore.getState().locale).toBe('ar');
    expect(Alert.alert).not.toHaveBeenCalled();
  });
});

describe('hydrate', () => {
  it('reloads before first paint when a fresh install needs RTL', async () => {
    // Previously the return value was discarded and no reload happened, so an
    // Arabic device rendered Arabic text in an LTR layout for a whole session.
    vi.mocked(applyRTLIfNeeded).mockResolvedValue(true);
    vi.mocked(reloadForRTL).mockResolvedValue(true);

    await useLocaleStore.getState().hydrate();

    expect(reloadForRTL).toHaveBeenCalledTimes(1);
    expect(useLocaleStore.getState().hydrated).toBe(false);
    expect(stored['dyarna.locale.rtlReloadFor']).toBe('rtl');
  });

  it('boots anyway when no reload is available', async () => {
    vi.mocked(applyRTLIfNeeded).mockResolvedValue(true);
    vi.mocked(reloadForRTL).mockResolvedValue(false);

    await useLocaleStore.getState().hydrate();

    expect(useLocaleStore.getState()).toMatchObject({ locale: 'ar', hydrated: true });
  });

  it('never reloads twice for the same direction', async () => {
    // Loop guard: if forceRTL() does not stick, the direction still mismatches
    // on the next launch and an unguarded hydrate would restart forever.
    stored['dyarna.locale.rtlReloadFor'] = 'rtl';
    vi.mocked(applyRTLIfNeeded).mockResolvedValue(true);

    await useLocaleStore.getState().hydrate();

    expect(reloadForRTL).not.toHaveBeenCalled();
    expect(useLocaleStore.getState()).toMatchObject({ locale: 'ar', hydrated: true });
  });

  it('does not reload when the direction already matches', async () => {
    stored['dyarna.locale'] = 'en';
    vi.mocked(applyRTLIfNeeded).mockResolvedValue(false);

    await useLocaleStore.getState().hydrate();

    expect(reloadForRTL).not.toHaveBeenCalled();
    expect(useLocaleStore.getState()).toMatchObject({ locale: 'en', hydrated: true });
  });
});
