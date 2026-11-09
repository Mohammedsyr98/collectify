import type { SupportedLocale } from '@/shared/localization';

export const customerDetailsResources = {
  en: {
    common: {
      customers: {
        actions: {
          addDebt: 'Add debt',
          recordPayment: 'Record payment',
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
        notFound: {
          action: 'Back to Customers',
          detail: 'This customer may have been removed or belongs to another owner.',
          title: 'Customer not found',
        },
      },
      debts: {
        card: {
          actions: {
            delete: 'Delete debt',
            edit: 'Edit debt',
            menuLabel: 'Actions for {{description}}',
            openMenu: 'Open actions for {{description}}',
            recordPayment: 'Record payment',
          },
          dueDate: 'Due',
          dueToday: 'Due today',
          dueTodayInstallmentCount: '{{count}} due today',
          hideInstallments: 'Hide installments',
          installmentCount: '{{count}} installments',
          installmentNumber: 'Installment {{number}}',
          installmentScheduleLabel: 'Installment schedule for {{description}}',
          onePayment: 'One payment',
          overdue: 'Overdue',
          overdueInstallmentCount: '{{count}} overdue',
          paid: 'Paid',
          paymentProgress: 'Payment progress for {{description}}',
          remaining: 'Remaining',
          upcoming: 'Upcoming',
          viewInstallments: 'View installments',
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
      },
    },
  },
  tr: {
    common: {
      customers: {
        actions: {
          addDebt: 'Borç ekle',
          recordPayment: 'Odeme kaydet',
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
        notFound: {
          action: 'Musterilere don',
          detail: 'Bu musteri silinmis veya baska bir sahibe ait olabilir.',
          title: 'Musteri bulunamadi',
        },
      },
      debts: {
        card: {
          actions: {
            delete: 'Borcu sil',
            edit: 'Borcu düzenle',
            menuLabel: '{{description}} işlemleri',
            openMenu: '{{description}} işlemlerini aç',
            recordPayment: 'Ödeme kaydet',
          },
          dueDate: 'Vade',
          dueToday: 'Vadesi bugün',
          dueTodayInstallmentCount: '{{count}} vadesi bugün',
          hideInstallments: 'Taksitleri gizle',
          installmentCount: '{{count}} taksit',
          installmentNumber: 'Taksit {{number}}',
          installmentScheduleLabel: '{{description}} için taksit planı',
          onePayment: 'Tek ödeme',
          overdue: 'Vadesi geçmiş',
          overdueInstallmentCount: '{{count}} vadesi geçmiş',
          paid: 'Ödenen',
          paymentProgress: '{{description}} ödeme ilerlemesi',
          remaining: 'Kalan',
          upcoming: 'Bekliyor',
          viewInstallments: 'Taksitleri göster',
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
      },
    },
  },
  ar: {
    common: {
      customers: {
        actions: {
          addDebt: 'أضف دينًا',
          recordPayment: 'سجل دفعة',
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
        notFound: {
          action: 'العودة إلى العملاء',
          detail: 'قد يكون هذا العميل محذوفًا أو يخص مالكًا آخر.',
          title: 'لم يتم العثور على العميل',
        },
      },
      debts: {
        card: {
          actions: {
            delete: 'حذف الدين',
            edit: 'تحرير الدين',
            menuLabel: 'إجراءات {{description}}',
            openMenu: 'فتح إجراءات {{description}}',
            recordPayment: 'سجل دفعة',
          },
          dueDate: 'الاستحقاق',
          dueToday: 'مستحق اليوم',
          dueTodayInstallmentCount: '{{count}} مستحق اليوم',
          hideInstallments: 'إخفاء الأقساط',
          installmentCount: '{{count}} أقساط',
          installmentNumber: 'القسط {{number}}',
          installmentScheduleLabel: 'جدول الأقساط لـ {{description}}',
          onePayment: 'دفعة واحدة',
          overdue: 'متأخر',
          overdueInstallmentCount: '{{count}} متأخر',
          paid: 'المدفوع',
          paymentProgress: 'تقدم الدفع لـ {{description}}',
          remaining: 'المتبقي',
          upcoming: 'قادم',
          viewInstallments: 'عرض الأقساط',
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
      },
    },
  },
} satisfies Record<
  SupportedLocale,
  { common: { customers: Record<string, unknown>; debts: Record<string, unknown> } }
>;
