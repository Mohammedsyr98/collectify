import {
  customerValidationCode,
  type CustomerValidationCode,
} from '@collectify/contracts';

import type { SupportedLocale } from '../../../shared/localization';

type CustomerValidationTranslationMessages = Record<CustomerValidationCode, string>;

export const customerValidationTranslations = {
  en: {
    [customerValidationCode.customerCodeRequired]: 'Customer code is required.',
    [customerValidationCode.customerNameRequired]: 'Customer name is required.',
    [customerValidationCode.customerPhoneNumberRequired]:
      'Phone number is required.',
  },
  tr: {
    [customerValidationCode.customerCodeRequired]: 'Musteri kodu gereklidir.',
    [customerValidationCode.customerNameRequired]: 'Musteri adi gereklidir.',
    [customerValidationCode.customerPhoneNumberRequired]:
      'Telefon numarasi gereklidir.',
  },
  ar: {
    [customerValidationCode.customerCodeRequired]:
      'رمز العميل مطلوب.',
    [customerValidationCode.customerNameRequired]:
      'اسم العميل مطلوب.',
    [customerValidationCode.customerPhoneNumberRequired]:
      'رقم الهاتف مطلوب.',
  },
} satisfies Record<SupportedLocale, CustomerValidationTranslationMessages>;
