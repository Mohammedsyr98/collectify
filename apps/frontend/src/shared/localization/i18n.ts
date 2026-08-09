import i18next, { type i18n } from 'i18next';
import { initReactI18next } from 'react-i18next';

import { defaultLocale, supportedLocales, type SupportedLocale } from './locales';

const defaultNamespace = 'common';

const resources = {
  en: {
    common: {
      locale: {
        english: 'English',
        turkish: 'Turkish',
      },
    },
  },
  tr: {
    common: {
      locale: {
        english: '\u0130ngilizce',
        turkish: 'T\u00fcrk\u00e7e',
      },
    },
  },
} as const;

export function createI18nInstance(initialLocale: SupportedLocale): i18n {
  const instance = i18next.createInstance();

  void instance.use(initReactI18next).init({
    defaultNS: defaultNamespace,
    fallbackLng: defaultLocale,
    initAsync: false,
    interpolation: {
      escapeValue: false,
    },
    lng: initialLocale,
    ns: [defaultNamespace],
    resources,
    supportedLngs: [...supportedLocales],
  });

  return instance;
}
