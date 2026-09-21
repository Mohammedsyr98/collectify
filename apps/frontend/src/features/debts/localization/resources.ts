import type { SupportedLocale } from '../../../shared/localization';
import { debtApiErrorTranslations } from './debtApiErrorTranslations';
import { debtValidationTranslations } from './debtValidationTranslations';

export const debtResources = {
  en: {
    common: {
      debts: {
          card: {
          actions: {
            delete: 'Delete debt',
            edit: 'Edit debt',
            menuLabel: 'Actions for {{description}}',
            openMenu: 'Open actions for {{description}}',
          },
          dueDate: 'Due',
          dueToday: 'Due today',
          onePayment: 'One payment',
          overdue: 'Overdue',
          paid: 'Paid',
          paymentProgress: 'Payment progress for {{description}}',
          remaining: 'Remaining',
          upcoming: 'Upcoming',
        },
        delete: {
          amountLabel: 'Total to delete',
          cancel: 'Cancel',
          confirm: 'Delete debt',
          deleting: 'Deleting',
          description:
            'Are you sure you want to permanently delete "{{description}}"? This action cannot be undone.',
          title: 'Delete debt',
        },
        drawer: {
          close: 'Close debt form',
          description: 'Create a one-payment debt for this customer.',
          editDescription: 'Edit this one-payment debt for this customer.',
          editTitle: 'Edit debt',
          createTitle: 'Add debt',
        },
        errors: debtApiErrorTranslations.en,
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
          edit: {
            errorTitle: 'Could not update debt',
            successDescription: '{{description}} was updated.',
            successTitle: 'Debt updated',
          },
          delete: {
            errorTitle: 'Could not delete debt',
            successDescription: '{{description}} was deleted.',
            successTitle: 'Debt deleted',
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
          actions: {
            delete: 'Borcu sil',
            edit: 'Borcu düzenle',
            menuLabel: '{{description}} işlemleri',
            openMenu: '{{description}} işlemlerini aç',
          },
          dueDate: 'Vade',
          dueToday: 'Vadesi bugün',
          onePayment: 'Tek ödeme',
          overdue: 'Vadesi geçmiş',
          paid: 'Ödenen',
          paymentProgress: '{{description}} ödeme ilerlemesi',
          remaining: 'Kalan',
          upcoming: 'Bekliyor',
        },
        delete: {
          amountLabel: 'Silinecek toplam',
          cancel: 'İptal',
          confirm: 'Borcu sil',
          deleting: 'Siliniyor',
          description:
            '"{{description}}" borcunu kalıcı olarak silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.',
          title: 'Borcu sil',
        },
        drawer: {
          close: 'Borç formunu kapat',
          description: 'Bu müşteri için tek ödemeli bir borç oluşturun.',
          editDescription: 'Bu müşterinin tek ödemeli borcunu düzenleyin.',
          editTitle: 'Borcu düzenle',
          createTitle: 'Borç ekle',
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
          edit: {
            errorTitle: 'Borç güncellenemedi',
            successDescription: '{{description}} güncellendi.',
            successTitle: 'Borç güncellendi',
          },
          delete: {
            errorTitle: 'Borç silinemedi',
            successDescription: '{{description}} silindi.',
            successTitle: 'Borç silindi',
          },
        },
        validation: debtValidationTranslations.tr,
        errors: debtApiErrorTranslations.tr,
      },
    },
  },
  ar: {
    common: {
      debts: {
          card: {
          actions: {
            delete: 'حذف الدين',
            edit: 'تحرير الدين',
            menuLabel: 'إجراءات {{description}}',
            openMenu: 'فتح إجراءات {{description}}',
          },
          dueDate: 'الاستحقاق',
          dueToday: 'مستحق اليوم',
          onePayment: 'دفعة واحدة',
          overdue: 'متأخر',
          paid: 'المدفوع',
          paymentProgress: 'تقدم الدفع لـ {{description}}',
          remaining: 'المتبقي',
          upcoming: 'قادم',
        },
        delete: {
          amountLabel: 'الإجمالي المراد حذفه',
          cancel: 'إلغاء',
          confirm: 'حذف الدين',
          deleting: 'جارٍ الحذف',
          description:
            'هل أنت متأكد من حذف الدين "{{description}}" نهائيًا؟ لا يمكن التراجع عن هذا الإجراء.',
          title: 'حذف الدين',
        },
        drawer: {
          close: 'إغلاق نموذج الدين',
          description: 'أنشئ دينًا بدفعة واحدة لهذا العميل.',
          editDescription: 'حرّر الدين ذي الدفعة الواحدة لهذا العميل.',
          editTitle: 'تحرير الدين',
          createTitle: 'إضافة دين',
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
          edit: {
            errorTitle: 'تعذر تحديث الدين',
            successDescription: 'تم تحديث {{description}}.',
            successTitle: 'تم تحديث الدين',
          },
          delete: {
            errorTitle: 'تعذر حذف الدين',
            successDescription: 'تم حذف {{description}}.',
            successTitle: 'تم حذف الدين',
          },
        },
        validation: debtValidationTranslations.ar,
        errors: debtApiErrorTranslations.ar,
      },
    },
  },
} satisfies Record<SupportedLocale, { common: { debts: Record<string, unknown> } }>;
