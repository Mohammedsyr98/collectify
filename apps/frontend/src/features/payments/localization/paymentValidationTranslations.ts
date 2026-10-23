import {
  paymentValidationCode,
  type PaymentValidationCode,
} from '@collectify/contracts';

import type { SupportedLocale } from '../../../shared/localization';

type PaymentValidationTranslationMessages = Record<PaymentValidationCode, string>;

export const paymentValidationTranslations = {
  en: {
    [paymentValidationCode.paymentTargetScheduleItemIdRequired]: 'Choose a payment target.',
    [paymentValidationCode.paymentAmountInvalid]: 'Enter a valid positive amount.',
    [paymentValidationCode.paymentAmountTooLarge]: 'Amount is too large.',
    [paymentValidationCode.paymentDateInvalid]: 'Enter a valid payment date.',
    [paymentValidationCode.paymentNoteTooLong]: 'Note must be 500 characters or fewer.',
    [paymentValidationCode.paymentExpectedDebtVersionInvalid]: 'We couldn\'t verify the current debt details. Refresh the page and try again.',
    [paymentValidationCode.paymentIdempotencyKeyInvalid]: 'We couldn\'t submit the payment. Refresh the page and try again.',
  },
  tr: {
    [paymentValidationCode.paymentTargetScheduleItemIdRequired]: 'Bir ödeme hedefi seçin.',
    [paymentValidationCode.paymentAmountInvalid]: 'Geçerli ve pozitif bir tutar girin.',
    [paymentValidationCode.paymentAmountTooLarge]: 'Tutar çok büyük.',
    [paymentValidationCode.paymentDateInvalid]: 'Geçerli bir ödeme tarihi girin.',
    [paymentValidationCode.paymentNoteTooLong]: 'Not en fazla 500 karakter olabilir.',
    [paymentValidationCode.paymentExpectedDebtVersionInvalid]: 'Güncel borç bilgileri doğrulanamadı. Sayfayı yenileyip tekrar deneyin.',
    [paymentValidationCode.paymentIdempotencyKeyInvalid]: 'Ödeme gönderilemedi. Sayfayı yenileyip tekrar deneyin.',
  },
  ar: {
    [paymentValidationCode.paymentTargetScheduleItemIdRequired]: 'اختر هدفًا للدفع.',
    [paymentValidationCode.paymentAmountInvalid]: 'أدخل مبلغًا موجبًا صالحًا.',
    [paymentValidationCode.paymentAmountTooLarge]: 'المبلغ كبير جدًا.',
    [paymentValidationCode.paymentDateInvalid]: 'أدخل تاريخ دفع صالحًا.',
    [paymentValidationCode.paymentNoteTooLong]: 'يجب ألا تتجاوز الملاحظة 500 حرف.',
    [paymentValidationCode.paymentExpectedDebtVersionInvalid]: 'تعذر التحقق من بيانات الدين الحالية. حدّث الصفحة ثم حاول مرة أخرى.',
    [paymentValidationCode.paymentIdempotencyKeyInvalid]: 'تعذر إرسال الدفعة. حدّث الصفحة ثم حاول مرة أخرى.',
  },
} satisfies Record<SupportedLocale, PaymentValidationTranslationMessages>;
