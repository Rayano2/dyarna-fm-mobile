import { create } from 'zustand';
import * as Localization from 'expo-localization';
import { secureStorage } from '@/shared/lib/storage';
import { changeI18nLocale, initI18n, type SupportedLocale } from '../i18n';
import { applyRTLIfNeeded, isRTLLocale, reloadForRTL } from '../i18n/rtl';

const STORAGE_KEY = 'dyarna.locale';
/** Direction a hydrate-time reload was already attempted for. Loop guard —
 *  see reloadOnceForHydrate(). */
const RTL_RELOAD_KEY = 'dyarna.locale.rtlReloadFor';

interface LocaleState {
  locale: SupportedLocale;
  hydrated: boolean;
  hydrate(): Promise<void>;
  setLocale(locale: SupportedLocale): Promise<void>;
}

function resolveInitialLocale(stored: string | null): SupportedLocale {
  if (stored === 'en' || stored === 'ar') return stored;
  const device = Localization.getLocales()[0]?.languageCode;
  return device === 'ar' ? 'ar' : 'en';
}

/**
 * Reloads at hydrate time, at most once per direction.
 *
 * forceRTL() persists natively, so after the reload the direction already
 * matches on the next launch and applyRTLIfNeeded() returns false — one
 * reload, no loop. The persisted marker is the belt-and-braces guard for the
 * case where the flag does NOT stick: without it the app would restart on
 * every single launch. Having already tried for this direction we give up and
 * boot with the direction mismatched rather than brick the install.
 *
 * Returns true when a reload is under way and the caller must not paint.
 */
async function reloadOnceForHydrate(locale: SupportedLocale): Promise<boolean> {
  const direction = isRTLLocale(locale) ? 'rtl' : 'ltr';
  try {
    if ((await secureStorage.getString(RTL_RELOAD_KEY)) === direction) return false;
    await secureStorage.setString(RTL_RELOAD_KEY, direction);
  } catch {
    // Marker unreadable/unwritable — we cannot prove this is the first
    // attempt, so skip the reload rather than risk restarting every launch.
    return false;
  }
  return reloadForRTL();
}

export const useLocaleStore = create<LocaleState>((set, get) => ({
  locale: 'en',
  hydrated: false,
  hydrate: async () => {
    const stored = await secureStorage.getString(STORAGE_KEY);
    const resolved = resolveInitialLocale(stored);
    await initI18n(resolved);

    // A fresh install on an Arabic-locale device starts with the native RTL
    // flag still false. The layout itself no longer depends on it: RootLayout
    // sets `direction` from `locale`, so setting it below boots the tree RTL
    // in every build (FM #110 item 2). forceRTL() is still applied so native
    // pieces (RN <Modal> roots, system controls) match from the next launch,
    // and where a reload IS available (dev clients) we still take it once,
    // before first paint — RootLayout gates on `hydrated`, so nothing has
    // painted yet and the splash stays up until the runtime restarts.
    const rtlChanged = await applyRTLIfNeeded(resolved);
    if (rtlChanged && (await reloadOnceForHydrate(resolved))) return;

    set({ locale: resolved, hydrated: true });
  },
  setLocale: async (locale) => {
    if (locale === get().locale) return;
    await secureStorage.setString(STORAGE_KEY, locale);

    // If the new locale flips RTL we MUST reload before any React work
    // sees the new direction. Calling i18n.changeLanguage() or set() first
    // fires re-renders that race I18nManager.forceRTL() against Fabric
    // teardown — two JS runtimes end up alive at once and Hermes
    // dereferences freed shadow nodes (TestFlight crashes 8014EB3A,
    // 539CB0AF on the language toggle). The new locale is picked up on
    // next launch via SecureStore → hydrate().
    const rtlChanged = await applyRTLIfNeeded(locale);
    if (rtlChanged) {
      if (await reloadForRTL()) return;

      // No reload is pending, so the runtime is staying up and the crash
      // above cannot happen: there is no teardown for the re-renders to race.
      // Returning early here instead is what broke release builds — nothing
      // changed at all, i18n.language stayed 'en' and the toggle snapped back
      // (#34). Apply the locale in-process: the strings follow via i18n and
      // the layout via RootLayout's JS `direction`, so there is nothing left
      // to ask the user to relaunch for (FM #110 item 2). Only native pieces
      // outside the React root catch up on the next launch.
      await changeI18nLocale(locale);
      set({ locale });
      return;
    }

    // Same direction (en ↔ en or ar ↔ ar after a previous flip already
    // settled RTL state) — safe to swap in-process without a reload.
    await changeI18nLocale(locale);
    set({ locale });
  },
}));
