import type { SupportedLocale } from '../../../shared/localization';
import { customerApiErrorTranslations } from './customerApiErrorTranslations';
import { customerValidationTranslations } from './customerValidationTranslations';

export const customerResources = {
  en: {
    common: {
      customers: {
        actions: {
          addDebt: 'Add debt',
          edit: 'Edit customer',
          recordPayment: 'Record payment',
          save: 'Save customer',
          saving: 'Saving',
        },
        create: {
          close: 'Close customer form',
          description: 'Create a customer for debt and payment tracking.',
          title: 'Create customer',
        },
        details: {
          address: 'Address',
          allCurrencies: 'All currencies',
          balance: 'Balance',
          code: 'Code',
          currency: 'Currency',
          financialSummary: 'Financial summary',
          noFinancialActivity: 'No financial activity',
          noAddress: 'No address',
          paidInFull: 'Paid in full',
          paymentProgress: 'Payment progress for {{currency}}',
          payments: 'Payments',
          paymentsUnavailable: 'Payment history is not available yet.',
          phoneNumber: 'Phone',
          totalDebt: 'Total debt',
          totalPaid: 'Total paid',
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
        notFound: {
          action: 'Back to Customers',
          detail: 'This customer may have been removed or belongs to another owner.',
          title: 'Customer not found',
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
          addDebt: 'Borç ekle',
          edit: 'Musteriyi duzenle',
          recordPayment: 'Odeme kaydet',
          save: 'Musteriyi kaydet',
          saving: 'Kaydediliyor',
        },
        create: {
          close: 'Musteri formunu kapat',
          description: 'Borç ve ödeme takibi için bir müşteri oluşturun.',
          title: 'Musteri olustur',
        },
        details: {
          address: 'Adres',
          allCurrencies: 'Tum para birimleri',
          balance: 'Bakiye',
          code: 'Kod',
          currency: 'Para birimi',
          financialSummary: 'Finansal ozet',
          noFinancialActivity: 'Finansal faaliyet yok.',
          noAddress: 'Adres yok',
          paidInFull: 'Tamami odendi',
          paymentProgress: '{{currency}} icin odeme ilerlemesi',
          payments: 'Odemeler',
          paymentsUnavailable: 'Ödeme geçmişi henüz kullanılamıyor.',
          phoneNumber: 'Telefon',
          totalDebt: 'Toplam borc',
          totalPaid: 'Toplam odenen',
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
        notFound: {
          action: 'Musterilere don',
          detail: 'Bu musteri silinmis veya baska bir sahibe ait olabilir.',
          title: 'Musteri bulunamadi',
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
          addDebt: 'أضف دينًا',
          edit: 'عدّل العميل',
          recordPayment: 'سجل دفعة',
          save: 'احفظ العميل',
          saving: 'جارٍ الحفظ',
        },
        create: {
          close: 'أغلق نموذج العميل',
          description: 'أنشئ عميلًا لتتبع الديون والمدفوعات.',
          title: 'أنشئ عميلًا',
        },
        details: {
          address: 'العنوان',
          allCurrencies: 'جميع العملات',
          balance: 'الرصيد',
          code: 'الرمز',
          currency: 'العملة',
          financialSummary: 'الملخص المالي',
          noFinancialActivity: 'لا يوجد نشاط مالي',
          noAddress: 'لا يوجد عنوان',
          paidInFull: 'تم السداد بالكامل',
          paymentProgress: 'تقدم السداد بعملة {{currency}}',
          payments: 'الدفعات',
          paymentsUnavailable: 'سجل الدفعات غير متاح بعد.',
          phoneNumber: 'الهاتف',
          totalDebt: 'إجمالي الدين',
          totalPaid: 'إجمالي المدفوع',
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
        notFound: {
          action: 'العودة إلى العملاء',
          detail: 'قد يكون هذا العميل محذوفًا أو يخص مالكًا آخر.',
          title: 'لم يتم العثور على العميل',
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
} satisfies Record<
  SupportedLocale,
  { common: { customers: Record<string, unknown> } }
>;
