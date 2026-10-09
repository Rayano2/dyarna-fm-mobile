import { useTranslation } from 'react-i18next';

/**
 * Plain RN style object (deliberately not run through Unistyles) that
 * right-aligns Text content for Arabic. textAlign alone doesn't reliably
 * stick in this codebase — Unistyles + iOS RN combo seems to drop it for
 * some Text components — so we also pin the Text to the cross-axis start
 * via alignSelf, which auto-flips through flexbox and is layout-driven.
 *
 * Use this for Text in COLUMN-flex parents (where the Text would
 * otherwise stretch). For Text inside row-flex parents with explicit
 * `flex: 1`, use RTL_INLINE instead so the Text keeps filling its slot.
 */
export const RTL_TEXT: {
  textAlign: 'right';
  writingDirection: 'rtl';
  alignSelf: 'flex-start';
  maxWidth: '100%';
} = {
  textAlign: 'right',
  writingDirection: 'rtl',
  alignSelf: 'flex-start',
  maxWidth: '100%',
};

/**
 * RTL alignment for Text that must stay stretched (e.g. a `flex: 1`
 * Text inside a row). Skips the alignSelf override that would otherwise
 * collapse the Text to content width and break the row's layout.
 */
export const RTL_INLINE: { textAlign: 'right'; writingDirection: 'rtl' } = {
  textAlign: 'right',
  writingDirection: 'rtl',
};

/**
 * Returns true when the active UI locale is Arabic. Reads i18n.language
 * directly so it's reactive to language changes without depending on
 * I18nManager.isRTL (which only flips after a full app reload).
 */
export function useIsRtl(): boolean {
  const { i18n } = useTranslation();
  return i18n.language === 'ar';
}

/**
 * Convenience: returns RTL_TEXT when the locale is Arabic, otherwise null.
 * Slot it into any Text style array: `style={[styles.foo, rtlText]}`.
 */
export function useRtlTextStyle(): typeof RTL_TEXT | null {
  return useIsRtl() ? RTL_TEXT : null;
}
