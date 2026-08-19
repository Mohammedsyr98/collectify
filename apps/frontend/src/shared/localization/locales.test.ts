import { describe, expect, it } from 'vitest';

import {
  defaultLocale,
  localeMetadata,
  resolveInitialLocale,
  supportedLocales,
} from './locales';

describe('resolveInitialLocale', () => {
  it('declares Arabic as a right-to-left supported locale', () => {
    expect(supportedLocales).toEqual(['en', 'tr', 'ar']);
    expect(localeMetadata.ar).toMatchObject({
      code: 'ar',
      direction: 'rtl',
      label: 'Arabic',
    });
  });

  it('prefers a supported saved locale over browser language', () => {
    expect(
      resolveInitialLocale({
        browserLanguages: ['en-US'],
        savedLocale: 'ar',
      }),
    ).toBe('ar');
  });

  it('uses supported browser base language before falling back to English', () => {
    expect(
      resolveInitialLocale({
        browserLanguages: ['tr-TR', 'en-US'],
        savedLocale: null,
      }),
    ).toBe('tr');

    expect(
      resolveInitialLocale({
        browserLanguages: ['ar'],
        savedLocale: null,
      }),
    ).toBe('ar');

    expect(
      resolveInitialLocale({
        browserLanguages: ['fr-FR'],
        savedLocale: 'fr',
      }),
    ).toBe(defaultLocale);
  });

  it('ignores an unsupported saved locale before checking browser language', () => {
    expect(
      resolveInitialLocale({
        browserLanguages: ['ar-SA', 'tr-TR'],
        savedLocale: 'fr',
      }),
    ).toBe('ar');
  });
});
