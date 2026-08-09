import { createContext, useContext } from 'react';

import {
  type LocaleMetadata,
  type SupportedLocale,
} from './locales';

export type LocalizationContextValue = {
  locale: SupportedLocale;
  metadata: LocaleMetadata;
  setLocale: (locale: SupportedLocale) => Promise<void>;
  supportedLocales: readonly SupportedLocale[];
};

export const LocalizationContext =
  createContext<LocalizationContextValue | null>(null);

export function useLocalization() {
  const context = useContext(LocalizationContext);

  if (!context) {
    throw new Error('useLocalization must be used within LocalizationProvider.');
  }

  return context;
}
