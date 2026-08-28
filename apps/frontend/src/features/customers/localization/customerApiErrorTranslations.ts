import {
  customerApiErrorCode,
  type CustomerApiErrorCode,
} from '@collectify/contracts';

import type { SupportedLocale } from '../../../shared/localization';

type CustomerApiErrorTranslationMessages = Record<CustomerApiErrorCode, string>;

export const customerApiErrorTranslations = {
  en: {
    [customerApiErrorCode.validationError]: 'Check the highlighted fields.',
    [customerApiErrorCode.customerCodeAlreadyExists]:
      'A customer with this code already exists.',
    [customerApiErrorCode.customerNotFound]: 'Customer was not found.',
  },
  tr: {
    [customerApiErrorCode.validationError]:
      'Vurgulanan alanlari kontrol edin.',
    [customerApiErrorCode.customerCodeAlreadyExists]:
      'Bu kodla kayitli bir musteri zaten var.',
    [customerApiErrorCode.customerNotFound]: 'Musteri bulunamadi.',
  },
  ar: {
    [customerApiErrorCode.validationError]:
      'تحقق من الحقول المحددة.',
    [customerApiErrorCode.customerCodeAlreadyExists]:
      'يوجد عميل آخر مسجل بهذا الرمز.',
    [customerApiErrorCode.customerNotFound]:
      'لم يتم العثور على العميل.',
  },
} satisfies Record<SupportedLocale, CustomerApiErrorTranslationMessages>;
