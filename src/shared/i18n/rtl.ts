import { DevSettings, I18nManager } from 'react-native';
import * as Updates from 'expo-updates';
import type { SupportedLocale } from './index';

export function isRTLLocale(locale: SupportedLocale): boolean {
  return locale === 'ar';
}

export function isRTLActive(): boolean {
  return I18nManager.isRTL;
}

export async function applyRTLIfNeeded(locale: SupportedLocale): Promise<boolean> {
  const shouldBeRTL = isRTLLocale(locale);
  if (I18nManager.isRTL === shouldBeRTL) return false;
  I18nManager.allowRTL(shouldBeRTL);
  I18nManager.forceRTL(shouldBeRTL);
  return true;
}

/**
 * Restarts the JS runtime so a direction change made by applyRTLIfNeeded()
 * takes effect.
 *
 * Returns `true` when a reload is under way — the caller MUST stop touching
 * React state, the app is going down — and `false` when this build has no
 * reload mechanism at all, in which case the caller owns the fallback (apply
 * the locale in-process and tell the user to relaunch).
 *
 * The `Updates.isEnabled` check is deliberate. app.config.ts declares no
 * `updates` key, so release builds ship `expo.modules.updates.ENABLED=false`
 * and `reloadAsync()` REJECTS. That rejection used to be swallowed by an empty
 * catch, and the DevSettings fallback below is `__DEV__`-only, so release
 * builds reloaded nothing and reported nothing — the caller then returned
 * early and the language never changed (#34). Dev clients took the DevSettings
 * branch, which is why this never reproduced in development.
 */
export async function reloadForRTL(): Promise<boolean> {
  if (Updates.isEnabled) {
    try {
      await Updates.reloadAsync();
      return true;
    } catch {
      // Enabled but refused this call — fall through to the dev reload.
    }
  }
  if (__DEV__) {
    try {
      DevSettings.reload('RTL direction changed');
      return true;
    } catch {
      // Nothing else is safe to invoke from here.
    }
  }
  return false;
}
