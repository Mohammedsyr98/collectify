import type { SupportedLocale } from '../../../shared/localization';
import { customerApiErrorTranslations } from './customerApiErrorTranslations';
import { customerValidationTranslations } from './customerValidationTranslations';

export const customerResources = {
  en: {
    common: {
      customers: {
        actions: {
          addDebt: 'Add debt',
          create: 'Create customer',
          edit: 'Edit customer',
          recordPayment: 'Record payment',
          save: 'Save customer',
          saving: 'Saving',
        },
        create: {
          close: 'Close customer form',
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
          paymentsEmpty: 'No payments yet.',
          phoneNumber: 'Phone',
          totalDebt: 'Total debt',
          totalPaid: 'Total paid',
        },
        errors: customerApiErrorTranslations.en,
        edit: {
          close: 'Close customer form',
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
        list: {
          actions: {
            edit: 'Edit customer',
            menuLabel: 'Actions for {{name}}',
            openDetails: 'Open details',
            openMenu: 'Open actions for {{name}}',
          },
          columns: {
            actions: 'Actions',
            code: 'Code',
            name: 'Name',
            overdueAmount: 'Overdue amount',
            phone: 'Phone',
            remainingDebt: 'Remaining debt',
          },
          emptyFinancial: {
            overdueAmount: 'No overdue',
            remainingDebt: 'No debt',
          },
          extraCurrencies: {
            count: '+{{count}} currencies',
            countSingular: '+{{count}} currency',
            overdueDialogLabel: 'Overdue amount currencies for {{name}}',
            overdueAriaLabel: 'Show {{count}} more overdue amount currency for {{name}}',
            overdueAriaLabelPlural: 'Show {{count}} more overdue amount currencies for {{name}}',
            remainingDialogLabel: 'Remaining debt currencies for {{name}}',
            remainingAriaLabel: 'Show {{count}} more remaining debt currency for {{name}}',
            remainingAriaLabelPlural: 'Show {{count}} more remaining debt currencies for {{name}}',
          },
          error: {
            title: 'Could not load customers',
          },
          loading: 'Loading customers',
          pagination: {
            label: 'Customer pages',
            nextPage: 'Next page',
            previousPage: 'Previous page',
          },
        },
        page: {
          empty: 'Create your first customer to start tracking debts.',
          title: 'Customers',
        },
        search: {
          label: 'Search customers',
          placeholder: 'Search name, code, or phone',
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
          create: 'Musteri olustur',
          edit: 'Musteriyi duzenle',
          recordPayment: 'Odeme kaydet',
          save: 'Musteriyi kaydet',
          saving: 'Kaydediliyor',
        },
        create: {
          close: 'Musteri formunu kapat',
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
          paymentsEmpty: 'Henuz odeme yok.',
          phoneNumber: 'Telefon',
          totalDebt: 'Toplam borc',
          totalPaid: 'Toplam odenen',
        },
        errors: customerApiErrorTranslations.tr,
        edit: {
          close: 'Musteri formunu kapat',
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
        list: {
          actions: {
            edit: 'Musteriyi duzenle',
            menuLabel: '{{name}} icin islemler',
            openDetails: 'Detaylari ac',
            openMenu: '{{name}} icin islemleri ac',
          },
          columns: {
            actions: 'Islemler',
            code: 'Kod',
            name: 'Ad',
            overdueAmount: 'Geciken tutar',
            phone: 'Telefon',
            remainingDebt: 'Kalan borc',
          },
          emptyFinancial: {
            overdueAmount: 'Geciken yok',
            remainingDebt: 'Borc yok',
          },
          extraCurrencies: {
            count: '+{{count}} para birimi',
            countSingular: '+{{count}} para birimi',
            overdueDialogLabel: '{{name}} icin geciken tutar para birimleri',
            overdueAriaLabel: '{{name}} icin {{count}} ek geciken tutar para birimini goster',
            overdueAriaLabelPlural: '{{name}} icin {{count}} ek geciken tutar para birimini goster',
            remainingDialogLabel: '{{name}} icin kalan borc para birimleri',
            remainingAriaLabel: '{{name}} icin {{count}} ek kalan borc para birimini goster',
            remainingAriaLabelPlural: '{{name}} icin {{count}} ek kalan borc para birimini goster',
          },
          error: {
            title: 'Musteriler yuklenemedi',
          },
          loading: 'Musteriler yukleniyor',
          pagination: {
            label: 'Musteri sayfalari',
            nextPage: 'Sonraki sayfa',
            previousPage: 'Onceki sayfa',
          },
        },
        page: {
          empty: 'Borc takibine baslamak icin ilk musteriyi olusturun.',
          title: 'Musteriler',
        },
        search: {
          label: 'Musteri ara',
          placeholder: 'Ad, kod veya telefon ara',
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
          create: 'أنشئ عميلًا',
          edit: 'عدّل العميل',
          recordPayment: 'سجل دفعة',
          save: 'احفظ العميل',
          saving: 'جارٍ الحفظ',
        },
        create: {
          close: 'أغلق نموذج العميل',
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
          paymentsEmpty: 'لا توجد دفعات بعد.',
          phoneNumber: 'الهاتف',
          totalDebt: 'إجمالي الدين',
          totalPaid: 'إجمالي المدفوع',
        },
        errors: customerApiErrorTranslations.ar,
        edit: {
          close: 'أغلق نموذج العميل',
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
        list: {
          actions: {
            edit: 'تعديل العميل',
            menuLabel: 'إجراءات {{name}}',
            openDetails: 'افتح التفاصيل',
            openMenu: 'فتح إجراءات {{name}}',
          },
          columns: {
            actions: 'الإجراءات',
            code: 'الرمز',
            name: 'الاسم',
            overdueAmount: 'المبلغ المتأخر',
            phone: 'الهاتف',
            remainingDebt: 'الدين المتبقي',
          },
          emptyFinancial: {
            overdueAmount: 'لا يوجد متأخرات',
            remainingDebt: 'لا يوجد دين',
          },
          extraCurrencies: {
            count: '+{{count}} عملات',
            countSingular: '+{{count}} عملة',
            overdueDialogLabel: 'عملات المبلغ المتأخر لـ {{name}}',
            overdueAriaLabel: 'إظهار {{count}} عملة مبلغ متأخر إضافية لـ {{name}}',
            overdueAriaLabelPlural: 'إظهار {{count}} عملات مبلغ متأخر إضافية لـ {{name}}',
            remainingDialogLabel: 'عملات الدين المتبقي لـ {{name}}',
            remainingAriaLabel: 'إظهار {{count}} عملة دين متبق إضافية لـ {{name}}',
            remainingAriaLabelPlural: 'إظهار {{count}} عملات دين متبق إضافية لـ {{name}}',
          },
          error: {
            title: 'تعذر تحميل العملاء',
          },
          loading: 'جارٍ تحميل العملاء',
          pagination: {
            label: 'صفحات العملاء',
            nextPage: 'الصفحة التالية',
            previousPage: 'الصفحة السابقة',
          },
        },
        notFound: {
          action: 'العودة إلى العملاء',
          detail: 'قد يكون هذا العميل محذوفًا أو يخص مالكًا آخر.',
          title: 'لم يتم العثور على العميل',
        },
        page: {
          empty: 'أنشئ أول عميل لبدء متابعة الديون.',
          title: 'العملاء',
        },
        search: {
          label: 'ابحث عن العملاء',
          placeholder: 'ابحث بالاسم أو الرمز أو الهاتف',
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
