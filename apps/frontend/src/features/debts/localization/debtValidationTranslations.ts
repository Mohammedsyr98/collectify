import { debtValidationCode, type DebtValidationCode } from '@collectify/contracts';
import type { SupportedLocale } from '../../../shared/localization';
type DebtValidationTranslationMessages = Record<DebtValidationCode, string>;
export const debtValidationTranslations = {
  en: {
    [debtValidationCode.debtDescriptionRequired]: 'Description is required.',
    [debtValidationCode.debtDescriptionTooLong]: 'Description must be 200 characters or fewer.',
    [debtValidationCode.debtDueDateInvalid]: 'Enter a valid due date.',
    [debtValidationCode.debtDueDateRequired]: 'Due date is required.',
    [debtValidationCode.debtTotalAmountInvalid]: 'Enter a valid amount.',
    [debtValidationCode.debtTotalAmountTooLarge]: 'Amount is too large.',
    [debtValidationCode.debtTotalAmountMustBePositive]: 'Amount must be greater than zero.',
  },
  tr: {
    [debtValidationCode.debtDescriptionRequired]: 'Açıklama zorunludur.',
    [debtValidationCode.debtDescriptionTooLong]: 'Açıklama en fazla 200 karakter olabilir.',
    [debtValidationCode.debtDueDateInvalid]: 'Geçerli bir vade tarihi girin.',
    [debtValidationCode.debtDueDateRequired]: 'Vade tarihi zorunludur.',
    [debtValidationCode.debtTotalAmountInvalid]: 'Geçerli bir tutar girin.',
    [debtValidationCode.debtTotalAmountTooLarge]: 'Tutar çok büyük.',
    [debtValidationCode.debtTotalAmountMustBePositive]: 'Tutar sıfırdan büyük olmalıdır.',
  },
  ar: {
    [debtValidationCode.debtDescriptionRequired]: 'الوصف مطلوب.',
    [debtValidationCode.debtDescriptionTooLong]: 'يجب ألا يتجاوز الوصف 200 حرف.',
    [debtValidationCode.debtDueDateInvalid]: 'أدخل تاريخ استحقاق صالحًا.',
    [debtValidationCode.debtDueDateRequired]: 'تاريخ الاستحقاق مطلوب.',
    [debtValidationCode.debtTotalAmountInvalid]: 'أدخل مبلغًا صالحًا.',
    [debtValidationCode.debtTotalAmountTooLarge]: 'المبلغ كبير جدًا.',
    [debtValidationCode.debtTotalAmountMustBePositive]: 'يجب أن يكون المبلغ أكبر من صفر.',
  },
} satisfies Record<SupportedLocale, DebtValidationTranslationMessages>;
