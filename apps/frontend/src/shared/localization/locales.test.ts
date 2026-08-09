import { describe, expect, it } from 'vitest';

import { defaultLocale, resolveInitialLocale } from './locales';

describe('resolveInitialLocale', () => {
  it('prefers a supported saved locale over browser language', () => {
    expect(
      resolveInitialLocale({
        browserLanguages: ['en-US'],
        savedLocale: 'tr',
      }),
    ).toBe('tr');
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
        browserLanguages: ['fr-FR'],
        savedLocale: 'fr',
      }),
    ).toBe(defaultLocale);
  });

  it('ignores an unsupported saved locale before checking browser language', () => {
    expect(
      resolveInitialLocale({
        browserLanguages: ['tr-TR'],
        savedLocale: 'fr',
      }),
    ).toBe('tr');
  });
});
