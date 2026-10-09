import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './translations/en.json';
import ar from './translations/ar.json';

export { default as i18n } from 'i18next';

export type SupportedLocale = 'en' | 'ar';

export async function initI18n(initialLocale: SupportedLocale): Promise<void> {
  if (i18n.isInitialized) return;
  await i18n.use(initReactI18next).init({
    compatibilityJSON: 'v4',
    resources: {
      en: { translation: en },
      ar: { translation: ar },
    },
    lng: initialLocale,
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  });
}

export async function changeI18nLocale(locale: SupportedLocale): Promise<void> {
  await i18n.changeLanguage(locale);
}
