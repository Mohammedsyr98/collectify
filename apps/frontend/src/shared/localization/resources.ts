import type { SupportedLocale } from './locales';

export const sharedLocalizationResources = {
  en: {
    common: {
      locale: {
        english: 'English',
        turkish: 'Turkish',
      },
      errors: {
        genericDescription: 'Something went wrong. Try again.',
      },
    },
  },
  tr: {
    common: {
      locale: {
        english: '\u0130ngilizce',
        turkish: 'T\u00fcrk\u00e7e',
      },
      errors: {
        genericDescription: 'Bir \u015feyler ters gitti. Tekrar deneyin.',
      },
    },
  },
} satisfies Record<
  SupportedLocale,
  {
    common: {
      locale: Record<string, string>;
      errors: Record<string, string>;
    };
  }
>;
