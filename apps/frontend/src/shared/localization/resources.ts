import type { SupportedLocale } from './locales';

export const sharedLocalizationResources = {
  en: {
    common: {
      locale: {
        arabic: 'Arabic',
        english: 'English',
        turkish: 'Turkish',
      },
      errors: {
        retry: 'Try again',
        genericDescription: 'Something went wrong. Try again.',
      },
    },
  },
  tr: {
    common: {
      locale: {
        arabic: 'Arap\u00e7a',
        english: '\u0130ngilizce',
        turkish: 'T\u00fcrk\u00e7e',
      },
      errors: {
        retry: 'Tekrar dene',
        genericDescription: 'Bir \u015feyler ters gitti. Tekrar deneyin.',
      },
    },
  },
  ar: {
    common: {
      locale: {
        arabic: 'العربية',
        english: 'الإنجليزية',
        turkish: 'التركية',
      },
      errors: {
        retry: '\u062d\u0627\u0648\u0644 \u0645\u0631\u0629 \u0623\u062e\u0631\u0649',
        genericDescription: 'حدث خطأ ما. حاول مرة أخرى.',
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
