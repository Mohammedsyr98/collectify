import type { ReactNode } from 'react';

import { LocalizationProvider } from '../../shared/localization';

import { createAppI18nInstance } from './i18n';

export function AppLocalizationProvider({ children }: { children: ReactNode }) {
  return (
    <LocalizationProvider createI18nInstance={createAppI18nInstance}>
      {children}
    </LocalizationProvider>
  );
}
