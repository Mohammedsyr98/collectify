import type { SupportedLocale } from '../../../shared/localization';

export const customerDirectoryResources = {
  en: {
    common: {
      customerDirectory: {
        actions: {
          create: 'Create customer',
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
      },
    },
  },
  tr: {
    common: {
      customerDirectory: {
        actions: {
          create: 'Musteri olustur',
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
      },
    },
  },
  ar: {
    common: {
      customerDirectory: {
        actions: {
          create: 'أنشئ عميلًا',
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
        page: {
          empty: 'أنشئ أول عميل لبدء متابعة الديون.',
          title: 'العملاء',
        },
        search: {
          label: 'ابحث عن العملاء',
          placeholder: 'ابحث بالاسم أو الرمز أو الهاتف',
        },
      },
    },
  },
} satisfies Record<
  SupportedLocale,
  { common: { customerDirectory: Record<string, unknown> } }
>;
