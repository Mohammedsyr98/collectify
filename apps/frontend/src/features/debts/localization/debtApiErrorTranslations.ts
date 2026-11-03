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
    [debtApiErrorCode.debtHasPayments]:
      'A debt with recorded payments cannot be deleted.',
    [debtApiErrorCode.debtCurrencyChangeBlocked]:
      'Currency cannot be changed after a payment is recorded.',
    [debtApiErrorCode.debtPaymentPlanChangeBlocked]:
      'Payment plan cannot be changed after a payment is recorded.',
    [debtApiErrorCode.debtScheduleItemHasPayments]:
      'A schedule item with recorded payments cannot be removed.',
    [debtApiErrorCode.debtScheduleItemAmountBelowPaid]:
      'A schedule item amount cannot be reduced below payments received.',
    [debtApiErrorCode.debtTotalAmountBelowPaid]:
      'Debt total cannot be reduced below payments received.',
  },
  tr: {
    [debtApiErrorCode.debtHasPayments]:
      'Kay\u0131tl\u0131 \u00f6demesi olan bor\u00e7 silinemez.',
    [debtApiErrorCode.debtCurrencyChangeBlocked]:
      '\u00d6deme kaydedildikten sonra para birimi de\u011fi\u015ftirilemez.',
    [debtApiErrorCode.debtPaymentPlanChangeBlocked]:
      '\u00d6deme kaydedildikten sonra \u00f6deme plan\u0131 de\u011fi\u015ftirilemez.',
    [debtApiErrorCode.debtScheduleItemHasPayments]:
      'Kay\u0131tl\u0131 \u00f6demesi olan taksit kald\u0131r\u0131lamaz.',
    [debtApiErrorCode.debtScheduleItemAmountBelowPaid]:
      'Taksit tutar\u0131 al\u0131nan \u00f6demelerin alt\u0131na indirilemez.',
    [debtApiErrorCode.debtTotalAmountBelowPaid]:
      'Bor\u00e7 toplam\u0131 al\u0131nan \u00f6demelerin alt\u0131na indirilemez.',
    [debtApiErrorCode.debtVersionConflict]:
      'Bu borç başka bir işlem tarafından değiştirildi. Kaydetmeden önce gözden geçirin.',
    [debtApiErrorCode.validationError]: 'Vurgulanan alanları kontrol edin.',
    [debtApiErrorCode.debtNotFound]: 'Borç bulunamadı.',
  },
  ar: {
    [debtApiErrorCode.debtHasPayments]:
      '\u0644\u0627 \u064a\u0645\u0643\u0646 \u062d\u0630\u0641 \u062f\u064a\u0646 \u0628\u0647 \u062f\u0641\u0639\u0627\u062a \u0645\u0633\u062c\u0644\u0629.',
    [debtApiErrorCode.debtCurrencyChangeBlocked]:
      '\u0644\u0627 \u064a\u0645\u0643\u0646 \u062a\u063a\u064a\u064a\u0631 \u0627\u0644\u0639\u0645\u0644\u0629 \u0628\u0639\u062f \u062a\u0633\u062c\u064a\u0644 \u062f\u0641\u0639.',
    [debtApiErrorCode.debtPaymentPlanChangeBlocked]:
      '\u0644\u0627 \u064a\u0645\u0643\u0646 \u062a\u063a\u064a\u064a\u0631 \u062e\u0637\u0629 \u0627\u0644\u062f\u0641\u0639 \u0628\u0639\u062f \u062a\u0633\u062c\u064a\u0644 \u062f\u0641\u0639.',
    [debtApiErrorCode.debtScheduleItemHasPayments]:
      '\u0644\u0627 \u064a\u0645\u0643\u0646 \u062d\u0630\u0641 \u0628\u0646\u062f \u062c\u062f\u0648\u0644 \u0628\u0647 \u062f\u0641\u0639\u0627\u062a \u0645\u0633\u062c\u0644\u0629.',
    [debtApiErrorCode.debtScheduleItemAmountBelowPaid]:
      '\u0644\u0627 \u064a\u0645\u0643\u0646 \u062e\u0641\u0636 \u0645\u0628\u0644\u063a \u0627\u0644\u0628\u0646\u062f \u0625\u0644\u0649 \u0623\u0642\u0644 \u0645\u0646 \u0627\u0644\u062f\u0641\u0639\u0627\u062a \u0627\u0644\u0645\u0633\u062a\u0644\u0645\u0629.',
    [debtApiErrorCode.debtTotalAmountBelowPaid]:
      '\u0644\u0627 \u064a\u0645\u0643\u0646 \u062e\u0641\u0636 \u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u062f\u064a\u0646 \u0625\u0644\u0649 \u0623\u0642\u0644 \u0645\u0646 \u0627\u0644\u062f\u0641\u0639\u0627\u062a \u0627\u0644\u0645\u0633\u062a\u0644\u0645\u0629.',
    [debtApiErrorCode.debtVersionConflict]:
      'تم تغيير هذا الدين في طلب آخر. راجعه قبل الحفظ.',
    [debtApiErrorCode.validationError]: 'تحقق من الحقول المميزة.',
    [debtApiErrorCode.debtNotFound]: 'لم يتم العثور على الدين.',
  },
} satisfies Record<SupportedLocale, DebtApiErrorTranslationMessages>;
