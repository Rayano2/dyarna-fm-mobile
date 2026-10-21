import { useTranslation } from 'react-i18next';

/*
 * Why there is no `textAlign: 'right'` here (FM #110 item 2).
 *
 * RootLayout sets `direction: 'rtl'` on the root for Arabic, and Yoga
 * inherits it, so every Text is laid out with an RTL layout direction. React
 * Native then treats textAlign 'left'/'right' as start/end: iOS swaps them in
 * RCTAttributedTextUtils (`layoutDirection == RightToLeft`) and Android picks
 * ALIGN_OPPOSITE in TextLayoutManager. A hard 'right' therefore renders LEFT —
 * a double flip. That already happened after a native RTL restart
 * (I18nManager.isRTL true); the JS root direction would have spread it to
 * every install. Leaving textAlign unset lets the text take the natural
 * (start = right) alignment exactly once, in both cases.
 */

/**
 * Plain RN style object (deliberately not run through Unistyles) for Arabic
 * Text in COLUMN-flex parents: pins the Text to the cross-axis start, which
 * is the right edge under the RTL root, and sets an RTL base writing
 * direction so mixed Latin/Arabic strings order correctly.
 *
 * For Text inside row-flex parents with explicit `flex: 1`, use RTL_INLINE
 * instead so the Text keeps filling its slot.
 */
export const RTL_TEXT: {
  writingDirection: 'rtl';
  alignSelf: 'flex-start';
  maxWidth: '100%';
} = {
  writingDirection: 'rtl',
  alignSelf: 'flex-start',
  maxWidth: '100%',
};

/**
 * RTL base writing direction for Text that must stay stretched (e.g. a
 * `flex: 1` Text inside a row). Skips the alignSelf override that would
 * otherwise collapse the Text to content width and break the row's layout.
 */
export const RTL_INLINE: { writingDirection: 'rtl' } = {
  writingDirection: 'rtl',
};

/**
 * Returns true when the active UI locale is Arabic. Reads i18n.language
 * directly so it's reactive to language changes without depending on
 * I18nManager.isRTL (which only flips after a full app reload).
 *
 * Use it for SEMANTIC choices only (which caret icon, RTL writing direction).
 * Never use it to mirror layout (row-reverse, swapped left/right, textAlign
 * 'right'): the root `direction` already mirrors layout, so doing it again
 * here flips it back.
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
