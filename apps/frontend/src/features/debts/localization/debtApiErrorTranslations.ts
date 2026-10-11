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
    [debtApiErrorCode.debtVersionConflict]:
      'This debt was changed elsewhere. Review it before saving.',
  },
  tr: {
    [debtApiErrorCode.debtVersionConflict]:
      'Bu borç başka bir işlem tarafından değiştirildi. Kaydetmeden önce gözden geçirin.',
    [debtApiErrorCode.validationError]: 'Vurgulanan alanları kontrol edin.',
    [debtApiErrorCode.debtNotFound]: 'Borç bulunamadı.',
  },
  ar: {
    [debtApiErrorCode.debtVersionConflict]:
      'تم تغيير هذا الدين في طلب آخر. راجعه قبل الحفظ.',
    [debtApiErrorCode.validationError]: 'تحقق من الحقول المميزة.',
    [debtApiErrorCode.debtNotFound]: 'لم يتم العثور على الدين.',
  },
} satisfies Record<SupportedLocale, DebtApiErrorTranslationMessages>;
