import type { OwnerLanguage } from '@collectify/contracts';

export type SupportedLocale = OwnerLanguage;
export type TextDirection = 'ltr' | 'rtl';

export type LocaleMetadata = {
  code: SupportedLocale;
  direction: TextDirection;
  label: string;
};

export const defaultLocale = 'en' satisfies SupportedLocale;
export const localeStorageKey = 'collectify.locale';

export const localeMetadata = {
  en: {
    code: 'en',
    direction: 'ltr',
    label: 'English',
  },
  tr: {
    code: 'tr',
    direction: 'ltr',
    label: 'Turkish',
  },
  ar: {
    code: 'ar',
    direction: 'rtl',
    label: 'Arabic',
  },
} satisfies Record<SupportedLocale, LocaleMetadata>;

export const supportedLocales = Object.keys(localeMetadata) as SupportedLocale[];

export function isSupportedLocale(value: string): value is SupportedLocale {
  return Object.hasOwn(localeMetadata, value);
}

export function resolveInitialLocale({
  browserLanguages,
  savedLocale,
}: {
  browserLanguages: readonly string[];
  savedLocale: string | null;
}): SupportedLocale {
  if (savedLocale && isSupportedLocale(savedLocale)) {
    return savedLocale;
  }

  for (const browserLanguage of browserLanguages) {
    const normalizedLanguage = browserLanguage.toLowerCase();
    const baseLanguage = normalizedLanguage.split('-')[0];

    if (isSupportedLocale(normalizedLanguage)) {
      return normalizedLanguage;
    }

    if (isSupportedLocale(baseLanguage)) {
      return baseLanguage;
    }
  }

  return defaultLocale;
}
