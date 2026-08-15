import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { i18n } from 'i18next';
import { I18nextProvider } from 'react-i18next';

import {
  LocalizationContext,
  type LocalizationContextValue,
} from './useLocalization';
import {
  localeMetadata,
  localeStorageKey,
  resolveInitialLocale,
  supportedLocales,
  type SupportedLocale,
} from './locales';

export type CreateI18nInstance = (initialLocale: SupportedLocale) => i18n;

export function LocalizationProvider({
  children,
  createI18nInstance,
}: {
  children: ReactNode;
  createI18nInstance: CreateI18nInstance;
}) {
  const [{ i18n, initialLocale }] = useState(() => {
    const locale = resolveInitialLocale({
      browserLanguages: getBrowserLanguages(),
      savedLocale: readSavedLocale(),
    });

    return {
      i18n: createI18nInstance(locale),
      initialLocale: locale,
    };
  });
  const [locale, setActiveLocale] = useState(initialLocale);

  useLayoutEffect(() => {
    applyDocumentLocale(locale);
  }, [locale]);

  const setLocale = useCallback(
    async (nextLocale: SupportedLocale) => {
      await i18n.changeLanguage(nextLocale);
      writeSavedLocale(nextLocale);
      setActiveLocale(nextLocale);
    },
    [i18n],
  );

  const value = useMemo<LocalizationContextValue>(
    () => ({
      locale,
      metadata: localeMetadata[locale],
      setLocale,
      supportedLocales,
    }),
    [locale, setLocale],
  );

  return (
    <I18nextProvider i18n={i18n}>
      <LocalizationContext.Provider value={value}>
        {children}
      </LocalizationContext.Provider>
    </I18nextProvider>
  );
}

function applyDocumentLocale(locale: SupportedLocale) {
  const metadata = localeMetadata[locale];

  document.documentElement.lang = locale;
  document.documentElement.dir = metadata.direction;
}

function getBrowserLanguages() {
  if (navigator.languages.length > 0) {
    return navigator.languages;
  }

  return navigator.language ? [navigator.language] : [];
}

function readSavedLocale() {
  try {
    return window.localStorage.getItem(localeStorageKey);
  } catch {
    return null;
  }
}

function writeSavedLocale(locale: SupportedLocale) {
  try {
    window.localStorage.setItem(localeStorageKey, locale);
  } catch {
    // Losing local preference persistence should not block language changes.
  }
}
