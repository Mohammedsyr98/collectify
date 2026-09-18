import type { SupportedLocale } from '../../../shared/localization';
import { debtValidationTranslations } from './debtValidationTranslations';

export const debtResources = {
  en: {
    common: {
      debts: {
        card: {
          dueDate: 'Due',
          dueToday: 'Due today',
          onePayment: 'One payment',
          overdue: 'Overdue',
          paid: 'Paid',
          paymentProgress: 'Payment progress for {{description}}',
          remaining: 'Remaining',
          upcoming: 'Upcoming',
        },
        drawer: {
          close: 'Close debt form',
          description: 'Create a one-payment debt for this customer.',
          title: 'Add debt',
        },
        form: {
          cancel: 'Cancel',
          currencyLabel: 'Currency',
          descriptionLabel: 'Description',
          descriptionPlaceholder: 'Website redesign',
          dueDateLabel: 'Due date',
          save: 'Save debt',
          saving: 'Saving',
          totalAmountLabel: 'Total amount',
          totalAmountPlaceholder: '125.50',
        },
        section: {
          empty: 'No debts yet.',
          title: 'Debts',
        },
        search: {
          label: 'Search debts',
          placeholder: 'Search descriptions',
        },
        list: {
          error: {
            title: 'Could not load debts',
          },
          loading: 'Loading debts',
          pagination: {
            label: 'Debt pages',
            nextPage: 'Next page',
            previousPage: 'Previous page',
          },
        },
        toast: {
          create: {
            errorTitle: 'Could not create debt',
            successDescription: '{{description}} was added.',
            successTitle: 'Debt created',
          },
        },
        validation: debtValidationTranslations.en,
      },
    },
  },
  tr: {
    common: {
      debts: {
        card: {
          dueDate: 'Vade',
          dueToday: 'Vadesi bugün',
          onePayment: 'Tek ödeme',
          overdue: 'Vadesi geçmiş',
          paid: 'Ödenen',
          paymentProgress: '{{description}} ödeme ilerlemesi',
          remaining: 'Kalan',
          upcoming: 'Bekliyor',
        },
        drawer: {
          close: 'Borç formunu kapat',
          description: 'Bu müşteri için tek ödemeli bir borç oluşturun.',
          title: 'Borç ekle',
        },
        form: {
          cancel: 'İptal',
          currencyLabel: 'Para birimi',
          descriptionLabel: 'Açıklama',
          descriptionPlaceholder: 'Web sitesi yeniden tasarımı',
          dueDateLabel: 'Vade tarihi',
          save: 'Borcu kaydet',
          saving: 'Kaydediliyor',
          totalAmountLabel: 'Toplam tutar',
          totalAmountPlaceholder: '125.50',
        },
        section: {
          empty: 'Henüz borç yok.',
          title: 'Borçlar',
        },
        search: {
          label: 'Borç ara',
          placeholder: 'Açiklamalarda ara',
        },
        list: {
          error: {
            title: 'Borçlar yüklenemedi',
          },
          loading: 'Borclar yukleniyor',
          pagination: {
            label: 'Borç sayfaları',
            nextPage: 'Sonraki sayfa',
            previousPage: 'Önceki sayfa',
          },
        },
        toast: {
          create: {
            errorTitle: 'Borç oluşturulamadı',
            successDescription: '{{description}} eklendi.',
            successTitle: 'Borç oluşturuldu',
          },
        },
        validation: debtValidationTranslations.tr,
      },
    },
  },
  ar: {
    common: {
      debts: {
        card: {
          dueDate: 'الاستحقاق',
          dueToday: 'مستحق اليوم',
          onePayment: 'دفعة واحدة',
          overdue: 'متأخر',
          paid: 'المدفوع',
          paymentProgress: 'تقدم الدفع لـ {{description}}',
          remaining: 'المتبقي',
          upcoming: 'قادم',
        },
        drawer: {
          close: 'إغلاق نموذج الدين',
          description: 'أنشئ دينًا بدفعة واحدة لهذا العميل.',
          title: 'إضافة دين',
        },
        form: {
          cancel: 'إلغاء',
          currencyLabel: 'العملة',
          descriptionLabel: 'الوصف',
          descriptionPlaceholder: 'إعادة تصميم الموقع الإلكتروني',
          dueDateLabel: 'تاريخ الاستحقاق',
          save: 'حفظ الدين',
          saving: 'جارٍ الحفظ',
          totalAmountLabel: 'المبلغ الإجمالي',
          totalAmountPlaceholder: '125.50',
        },
        section: {
          empty: 'لا توجد ديون بعد.',
          title: 'الديون',
        },
        search: {
          label: 'ابحث عن الديون',
          placeholder: 'ابحث في الأوصاف',
        },
        list: {
          error: {
            title: 'تعذر تحميل الديون',
          },
          loading: 'جارٍ تحميل الديون',
          pagination: {
            label: 'صفحات الديون',
            nextPage: 'الصفحة التالية',
            previousPage: 'الصفحة السابقة',
          },
        },
        toast: {
          create: {
            errorTitle: 'تعذر إنشاء الدين',
            successDescription: 'تمت إضافة {{description}}.',
            successTitle: 'تم إنشاء الدين',
          },
        },
        validation: debtValidationTranslations.ar,
      },
    },
  },
} satisfies Record<SupportedLocale, { common: { debts: Record<string, unknown> } }>;
