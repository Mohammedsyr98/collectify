import {
  authValidationCode,
  type AuthValidationCode,
} from '@collectify/contracts';

import type { SupportedLocale } from '../../../shared/localization';

type AuthValidationTranslationMessages = Record<AuthValidationCode, string>;

export const authValidationTranslations = {
  en: {
    [authValidationCode.authDefaultCurrencyUnsupported]: 'Choose TRY, USD, or EUR.',
    [authValidationCode.authEmailInvalid]: 'Enter a valid email address.',
    [authValidationCode.authNameRequired]: 'Name is required.',
    [authValidationCode.authPreferredLanguageUnsupported]:
      'Choose English or Turkish.',
    [authValidationCode.authSignInPasswordRequired]: 'Password is required.',
    [authValidationCode.authSignUpPasswordLength]:
      'Password must be between 8 and 128 characters.',
  },
  tr: {
    [authValidationCode.authDefaultCurrencyUnsupported]: 'TRY, USD veya EUR seçin.',
    [authValidationCode.authEmailInvalid]: 'Geçerli bir e-posta adresi girin.',
    [authValidationCode.authNameRequired]: 'Ad gereklidir.',
    [authValidationCode.authPreferredLanguageUnsupported]:
      'İngilizce veya Türkçe seçin.',
    [authValidationCode.authSignInPasswordRequired]: 'Şifre gereklidir.',
    [authValidationCode.authSignUpPasswordLength]:
      'Şifre 8 ile 128 karakter arasında olmalıdır.',
  },
} satisfies Record<SupportedLocale, AuthValidationTranslationMessages>;
