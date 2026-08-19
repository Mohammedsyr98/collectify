import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  createI18nInstance,
  LocalizationProvider,
  localeStorageKey,
  type SupportedLocale,
  useLocalization,
} from './index';

const testI18nResources = {
  en: {
    common: {},
  },
  tr: {
    common: {},
  },
  ar: {
    common: {},
  },
};

function createTestI18nInstance(initialLocale: SupportedLocale) {
  return createI18nInstance({
    initialLocale,
    resources: testI18nResources,
  });
}

function LocaleProbe() {
  const { locale, setLocale } = useLocalization();

  return (
    <>
      <p>{locale}</p>
      <button onClick={() => void setLocale('tr')} type="button">
        Use Turkish
      </button>
      <button onClick={() => void setLocale('ar')} type="button">
        Use Arabic
      </button>
    </>
  );
}

function renderWithLocalization(children: ReactNode) {
  return render(
    <LocalizationProvider createI18nInstance={createTestI18nInstance}>
      {children}
    </LocalizationProvider>,
  );
}

function setBrowserLanguages(languages: readonly string[]) {
  Object.defineProperty(window.navigator, 'languages', {
    configurable: true,
    value: languages,
  });
}

describe('LocalizationProvider', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.lang = '';
    document.documentElement.removeAttribute('dir');
    setBrowserLanguages(['en-US']);
  });

  afterEach(() => {
    cleanup();
  });

  it('resolves the initial locale from browser language and updates document metadata', async () => {
    setBrowserLanguages(['tr-TR', 'en-US']);

    renderWithLocalization(<LocaleProbe />);

    expect(await screen.findByText('tr')).toBeInTheDocument();
    expect(document.documentElement).toHaveAttribute('lang', 'tr');
    expect(document.documentElement).toHaveAttribute('dir', 'ltr');
    expect(window.localStorage.getItem(localeStorageKey)).toBeNull();
  });

  it('persists explicit locale changes and updates document metadata', async () => {
    const user = userEvent.setup();

    renderWithLocalization(<LocaleProbe />);

    await user.click(screen.getByRole('button', { name: 'Use Arabic' }));

    await waitFor(() => {
      expect(document.documentElement).toHaveAttribute('lang', 'ar');
    });
    expect(document.documentElement).toHaveAttribute('dir', 'rtl');
    expect(window.localStorage.getItem(localeStorageKey)).toBe('ar');
  });
});
