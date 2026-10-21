import { layoutDirectionFor, type LayoutDirection } from '@/shared/i18n/rtl';
import { useLocaleStore } from '@/shared/stores/localeStore';

/**
 * 'rtl' | 'ltr' for the active locale. Put it on the style of every root the
 * JS tree has: RootLayout's GestureHandlerRootView and the top View inside
 * each RN <Modal>, which renders in its own native root and does not inherit
 * the app root's `direction`.
 */
export function useLayoutDirection(): LayoutDirection {
  return useLocaleStore((s) => layoutDirectionFor(s.locale));
}
