import { create } from 'zustand';
import { Alert } from 'react-native';
import * as Localization from 'expo-localization';
import { secureStorage } from '@/shared/lib/storage';
import { changeI18nLocale, i18n, initI18n, type SupportedLocale } from '../i18n';
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

/** Blocking acknowledgement: the strings have flipped but the native layout
 *  direction only applies on the next launch. One button — nothing to cancel.
 *  Shown in the newly selected language, which is already live in i18n. */
function promptRelaunch(): void {
  Alert.alert(i18n.t('language.restartTitle'), i18n.t('language.restartBody'), [
    { text: i18n.t('common.done') },
  ]);
}

export const useLocaleStore = create<LocaleState>((set, get) => ({
  locale: 'en',
  hydrated: false,
  hydrate: async () => {
    const stored = await secureStorage.getString(STORAGE_KEY);
    const resolved = resolveInitialLocale(stored);
    await initI18n(resolved);

    // A fresh install on an Arabic-locale device starts with the native RTL
    // flag still false, so applyRTLIfNeeded() sets it but the whole first
    // session would render Arabic text in an LTR layout (#34). Reloading is
    // cheap here: RootLayout gates on `hydrated`, so nothing has painted yet.
    // Deliberately NOT setting `hydrated` when a reload is under way — the
    // splash stays up until the runtime restarts, instead of mounting a tree
    // that is about to be torn down.
    const rtlChanged = await applyRTLIfNeeded(resolved);
    if (rtlChanged && (await reloadOnceForHydrate(resolved))) return;

    // Either the direction already matched, or no reload was available: boot
    // with the correct strings; the direction follows on the next launch.
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
      // (#34). Apply the locale in-process so the strings and the toggle
      // follow the user's choice, then tell them the layout needs a relaunch.
      await changeI18nLocale(locale);
      set({ locale });
      promptRelaunch();
      return;
    }

    // Same direction (en ↔ en or ar ↔ ar after a previous flip already
    // settled RTL state) — safe to swap in-process without a reload.
    await changeI18nLocale(locale);
    set({ locale });
  },
}));
