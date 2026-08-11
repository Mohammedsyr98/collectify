import { authApiErrorCode, type AuthApiErrorCode } from '@collectify/contracts';

import type { SupportedLocale } from '../../../shared/localization';

type AuthApiErrorTranslationMessages = Record<AuthApiErrorCode, string>;

export const authApiErrorTranslations = {
  en: {
    [authApiErrorCode.validationError]: 'Check the highlighted fields.',
    [authApiErrorCode.invalidCredentials]: 'Email or password is incorrect.',
    [authApiErrorCode.ownerProfileMissing]:
      'Owner profile setup is incomplete.',
    [authApiErrorCode.accountAlreadyExists]:
      'An account already exists for this email.',
    [authApiErrorCode.profileSetupFailed]:
      'We could not finish owner setup. Try again.',
  },
  tr: {
    [authApiErrorCode.validationError]:
      'Vurgulanan alanlar\u0131 kontrol edin.',
    [authApiErrorCode.invalidCredentials]:
      'E-posta veya \u015fifre hatal\u0131.',
    [authApiErrorCode.ownerProfileMissing]:
      'Sahip profili kurulumu eksik.',
    [authApiErrorCode.accountAlreadyExists]:
      'Bu e-posta adresiyle zaten bir hesap var.',
    [authApiErrorCode.profileSetupFailed]:
      'Sahip kurulumu tamamlanamad\u0131. Tekrar deneyin.',
  },
} satisfies Record<SupportedLocale, AuthApiErrorTranslationMessages>;
