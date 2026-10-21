import type { StyleProp, ViewStyle } from 'react-native';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { SupportedLocale } from '@/shared/i18n';
import { useLocaleStore } from '@/shared/stores/localeStore';
import { SegmentedPill } from './SegmentedPill';

export interface LanguageToggleProps {
  /** Segments get `${testID}-en` / `${testID}-ar`. */
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * The AR/EN pill bound to the locale store. Shared by Settings and the login
 * screen (FM #111) so both switch language the same way.
 */
export function LanguageToggle({ testID, style }: LanguageToggleProps): React.JSX.Element {
  const { t } = useTranslation();
  const locale = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);
  return (
    <View style={style}>
      <SegmentedPill<SupportedLocale>
        options={[
          { value: 'en', label: t('language.en') },
          { value: 'ar', label: t('language.ar') },
        ]}
        value={locale}
        onChange={(next) => {
          if (next !== locale) void setLocale(next);
        }}
        accessibilityHint={t('language.toggle')}
        {...(testID ? { testID } : {})}
      />
    </View>
  );
}
