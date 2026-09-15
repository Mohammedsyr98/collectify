import type { SupportedLocale } from '../../../shared/localization';
import { debtValidationTranslations } from './debtValidationTranslations';

export const debtResources = {
  en: {
    common: {
      debts: {
        card: {
          dueToday: 'Due today',
          onePayment: 'One payment',
          overdue: 'Overdue',
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
          dueToday: 'Vadesi bugün',
          onePayment: 'Tek ödeme',
          overdue: 'Vadesi geçmiş',
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
          dueToday: 'مستحق اليوم',
          onePayment: 'دفعة واحدة',
          overdue: 'متأخر',
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
} satisfies Record<
  SupportedLocale,
  { common: { debts: Record<string, unknown> } }
>;
