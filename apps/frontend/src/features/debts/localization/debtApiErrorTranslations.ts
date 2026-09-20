import {
  debtApiErrorCode,
  type DebtApiErrorCode,
} from '@collectify/contracts';

import type { SupportedLocale } from '../../../shared/localization';

type DebtApiErrorTranslationMessages = Record<DebtApiErrorCode, string>;

export const debtApiErrorTranslations = {
  en: {
    [debtApiErrorCode.validationError]: 'Check the highlighted fields.',
    [debtApiErrorCode.debtNotFound]: 'Debt was not found.',
  },
  tr: {
    [debtApiErrorCode.validationError]: 'Vurgulanan alanları kontrol edin.',
    [debtApiErrorCode.debtNotFound]: 'Borç bulunamadı.',
  },
  ar: {
    [debtApiErrorCode.validationError]: 'تحقق من الحقول المميزة.',
    [debtApiErrorCode.debtNotFound]: 'لم يتم العثور على الدين.',
  },
} satisfies Record<SupportedLocale, DebtApiErrorTranslationMessages>;
