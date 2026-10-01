import {
  debtPlanIssueCode,
  debtRequestValidationCode,
  type DebtValidationCode,
} from '@collectify/contracts';
import type { SupportedLocale } from '../../../shared/localization';
type DebtValidationTranslationMessages = Record<DebtValidationCode, string>;
export const debtValidationTranslations = {
  en: {
    [debtRequestValidationCode.debtDescriptionRequired]: 'Description is required.',
    [debtRequestValidationCode.debtDescriptionTooLong]: 'Description must be 200 characters or fewer.',
    [debtRequestValidationCode.debtDueDateInvalid]: 'Enter a valid due date.',
    [debtRequestValidationCode.debtDueDateRequired]: 'Due date is required.',
    [debtPlanIssueCode.scheduleItemAmountDoesNotMatchTotal]: 'Payment amount must match the debt total.',
    [debtRequestValidationCode.debtScheduleItemAmountInvalid]: 'Enter a valid payment amount.',
    [debtPlanIssueCode.scheduleItemAmountNotPositive]: 'Payment amount must be greater than zero.',
    [debtPlanIssueCode.scheduleItemCountInvalid]: 'A one-payment debt must contain exactly one payment.',
    [debtPlanIssueCode.scheduleItemDueDateInvalid]: 'Enter a valid due date.',
    [debtRequestValidationCode.debtTotalAmountInvalid]: 'Enter a valid amount.',
  },
  tr: {
    [debtRequestValidationCode.debtDescriptionRequired]: 'Açıklama zorunludur.',
    [debtRequestValidationCode.debtDescriptionTooLong]: 'Açıklama en fazla 200 karakter olabilir.',
    [debtRequestValidationCode.debtDueDateInvalid]: 'Geçerli bir vade tarihi girin.',
    [debtRequestValidationCode.debtDueDateRequired]: 'Vade tarihi zorunludur.',
    [debtPlanIssueCode.scheduleItemAmountDoesNotMatchTotal]: 'Ödeme tutarı borç toplamıyla eşleşmelidir.',
    [debtRequestValidationCode.debtScheduleItemAmountInvalid]: 'Geçerli bir ödeme tutarı girin.',
    [debtPlanIssueCode.scheduleItemAmountNotPositive]: 'Ödeme tutarı sıfırdan büyük olmalıdır.',
    [debtPlanIssueCode.scheduleItemCountInvalid]: 'Tek ödemeli borç tam olarak bir ödeme içermelidir.',
    [debtPlanIssueCode.scheduleItemDueDateInvalid]: 'Geçerli bir vade tarihi girin.',
    [debtRequestValidationCode.debtTotalAmountInvalid]: 'Geçerli bir tutar girin.',
  },
  ar: {
    [debtRequestValidationCode.debtDescriptionRequired]: 'الوصف مطلوب.',
    [debtRequestValidationCode.debtDescriptionTooLong]: 'يجب ألا يتجاوز الوصف 200 حرف.',
    [debtRequestValidationCode.debtDueDateInvalid]: 'أدخل تاريخ استحقاق صالحًا.',
    [debtRequestValidationCode.debtDueDateRequired]: 'تاريخ الاستحقاق مطلوب.',
    [debtPlanIssueCode.scheduleItemAmountDoesNotMatchTotal]: 'يجب أن يطابق مبلغ الدفعة إجمالي الدين.',
    [debtRequestValidationCode.debtScheduleItemAmountInvalid]: 'أدخل مبلغ دفعة صالحًا.',
    [debtPlanIssueCode.scheduleItemAmountNotPositive]: 'يجب أن يكون مبلغ الدفعة أكبر من صفر.',
    [debtPlanIssueCode.scheduleItemCountInvalid]: 'يجب أن يحتوي الدين ذو الدفعة الواحدة على دفعة واحدة تمامًا.',
    [debtPlanIssueCode.scheduleItemDueDateInvalid]: 'أدخل تاريخ استحقاق صالحًا.',
    [debtRequestValidationCode.debtTotalAmountInvalid]: 'أدخل مبلغًا صالحًا.',
  },
} satisfies Record<SupportedLocale, DebtValidationTranslationMessages>;
