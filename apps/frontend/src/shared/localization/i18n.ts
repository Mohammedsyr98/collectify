import i18next, { type i18n, type Resource } from 'i18next';
import { initReactI18next } from 'react-i18next';

import { defaultLocale, supportedLocales, type SupportedLocale } from './locales';

const defaultNamespace = 'common';

export function createI18nInstance({
  initialLocale,
  resources,
}: {
  initialLocale: SupportedLocale;
  resources: Resource;
}): i18n {
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
