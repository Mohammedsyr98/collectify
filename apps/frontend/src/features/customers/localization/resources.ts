import type { SupportedLocale } from '@/shared/localization';
import { customerApiErrorTranslations } from './customerApiErrorTranslations';
import { customerValidationTranslations } from './customerValidationTranslations';

export const customerResources = {
  en: {
    common: {
      customers: {
        actions: {
          edit: 'Edit customer',
          save: 'Save customer',
          saving: 'Saving',
        },
        create: {
          close: 'Close customer form',
          description: 'Create a customer for debt and payment tracking.',
          title: 'Create customer',
        },
        errors: customerApiErrorTranslations.en,
        edit: {
          close: 'Close customer form',
          description: "Edit this customer's details.",
          loading: 'Loading customer details.',
          title: 'Edit customer',
        },
        form: {
          addressLabel: 'Address',
          addressPlaceholder: 'Optional address',
          cancel: 'Cancel',
          codeLabel: 'Code',
          codePlaceholder: 'ACME-001',
          nameLabel: 'Name',
          namePlaceholder: 'Acme Market',
          phoneNumberLabel: 'Phone number',
          phoneNumberPlaceholder: '+90 555 123 45 67',
        },
        toast: {
          create: {
            errorTitle: 'Could not create customer',
            successDescription: '{{name}} is ready for debt tracking.',
            successTitle: 'Customer created',
          },
          editLoad: {
            errorTitle: 'Could not open customer editor',
          },
          update: {
            errorTitle: 'Could not update customer',
            successDescription: '{{name}} changes were saved.',
            successTitle: 'Customer updated',
          },
        },
        validation: customerValidationTranslations.en,
      },
    },
  },
  tr: {
    common: {
      customers: {
        actions: {
          edit: 'Musteriyi duzenle',
          save: 'Musteriyi kaydet',
          saving: 'Kaydediliyor',
        },
        create: {
          close: 'Musteri formunu kapat',
          description: 'Borç ve ödeme takibi için bir müşteri oluşturun.',
          title: 'Musteri olustur',
        },
        errors: customerApiErrorTranslations.tr,
        edit: {
          close: 'Musteri formunu kapat',
          description: 'Bu müşterinin bilgilerini düzenleyin.',
          loading: 'Müşteri bilgileri yükleniyor.',
          title: 'Musteriyi duzenle',
        },
        form: {
          addressLabel: 'Adres',
          addressPlaceholder: 'Istege bagli adres',
          cancel: 'Iptal',
          codeLabel: 'Kod',
          codePlaceholder: 'ACME-001',
          nameLabel: 'Ad',
          namePlaceholder: 'Acme Market',
          phoneNumberLabel: 'Telefon numarasi',
          phoneNumberPlaceholder: '+90 555 123 45 67',
        },
        toast: {
          create: {
            errorTitle: 'Musteri olusturulamadi',
            successDescription: '{{name}} borc takibi icin hazir.',
            successTitle: 'Musteri olusturuldu',
          },
          editLoad: {
            errorTitle: 'Musteri duzenleyici acilamadi',
          },
          update: {
            errorTitle: 'Musteri guncellenemedi',
            successDescription: '{{name}} degisiklikleri kaydedildi.',
            successTitle: 'Musteri guncellendi',
          },
        },
        validation: customerValidationTranslations.tr,
      },
    },
  },
  ar: {
    common: {
      customers: {
        actions: {
          edit: 'عدّل العميل',
          save: 'احفظ العميل',
          saving: 'جارٍ الحفظ',
        },
        create: {
          close: 'أغلق نموذج العميل',
          description: 'أنشئ عميلًا لتتبع الديون والمدفوعات.',
          title: 'أنشئ عميلًا',
        },
        errors: customerApiErrorTranslations.ar,
        edit: {
          close: 'أغلق نموذج العميل',
          description: 'عدّل تفاصيل هذا العميل.',
          loading: 'جارٍ تحميل تفاصيل العميل.',
          title: 'عدّل العميل',
        },
        form: {
          addressLabel: 'العنوان',
          addressPlaceholder: 'عنوان اختياري',
          cancel: 'إلغاء',
          codeLabel: 'الرمز',
          codePlaceholder: 'ACME-001',
          nameLabel: 'الاسم',
          namePlaceholder: 'سوق أكمي',
          phoneNumberLabel: 'رقم الهاتف',
          phoneNumberPlaceholder: '+90 555 123 45 67',
        },
        toast: {
          create: {
            errorTitle: 'تعذر إنشاء العميل',
            successDescription: '{{name}} جاهز لمتابعة الديون.',
            successTitle: 'تم إنشاء العميل',
          },
          editLoad: {
            errorTitle: 'تعذر فتح محرر العميل',
          },
          update: {
            errorTitle: 'تعذر تحديث العميل',
            successDescription: 'تم حفظ تغييرات {{name}}.',
            successTitle: 'تم تحديث العميل',
          },
        },
        validation: customerValidationTranslations.ar,
      },
    },
  },
} satisfies Record<SupportedLocale, { common: { customers: Record<string, unknown> } }>;
