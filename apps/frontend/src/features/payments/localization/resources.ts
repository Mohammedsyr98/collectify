import type { SupportedLocale } from '../../../shared/localization';
import { paymentApiErrorTranslations } from './paymentApiErrorTranslations';
import { paymentValidationTranslations } from './paymentValidationTranslations';

export const paymentResources = {
  en: {
    common: {
      payments: {
        drawer: {
          close: 'Close payment form',
          title: 'Record payment',
          description: 'Record a payment for {{description}}.',
          targetLabel: 'Payment target',
          targetRemainingLabel: 'Target remaining',
          debtRemainingLabel: 'Debt remaining',
          amountLabel: 'Payment amount',
          amountPlaceholder: '0.00',
          payFull: 'Pay full remaining amount',
          dateLabel: 'Payment date',
          noteLabel: 'Note (optional)',
          notePlaceholder: 'Add a note',
          previewTitle: 'After this payment',
          targetAfterLabel: 'Target remaining after payment',
          debtAfterLabel: 'Debt remaining after payment',
          cancel: 'Cancel',
          submit: 'Record payment',
          submitting: 'Recording',
          targetUnavailable: 'This payment target is no longer available.',
        },
        toast: {
          record: {
            successTitle: 'Payment recorded',
            successDescription: 'The payment was recorded successfully.',
            errorTitle: 'Payment could not be recorded',
          },
        },
        errors: paymentApiErrorTranslations.en,
        validation: paymentValidationTranslations.en,
      },
    },
  },
  tr: {
    common: {
      payments: {
        drawer: {
          close: 'Ödeme formunu kapat',
          title: 'Ödeme kaydet',
          description: '{{description}} için ödeme kaydedin.',
          targetLabel: 'Ödeme hedefi',
          targetRemainingLabel: 'Hedef kalan',
          debtRemainingLabel: 'Borç kalan',
          amountLabel: 'Ödeme tutarı',
          amountPlaceholder: '0,00',
          payFull: 'Kalan tutarın tamamını öde',
          dateLabel: 'Ödeme tarihi',
          noteLabel: 'Not (isteğe bağlı)',
          notePlaceholder: 'Not ekleyin',
          previewTitle: 'Bu ödemeden sonra',
          targetAfterLabel: 'Ödeme sonrası hedef kalan',
          debtAfterLabel: 'Ödeme sonrası borç kalan',
          cancel: 'İptal',
          submit: 'Ödeme kaydet',
          submitting: 'Kaydediliyor',
          targetUnavailable: 'Bu ödeme hedefi artık mevcut değil.',
        },
        toast: {
          record: {
            successTitle: 'Ödeme kaydedildi',
            successDescription: 'Ödeme başarıyla kaydedildi.',
            errorTitle: 'Ödeme kaydedilemedi',
          },
        },
        errors: paymentApiErrorTranslations.tr,
        validation: paymentValidationTranslations.tr,
      },
    },
  },
  ar: {
    common: {
      payments: {
        drawer: {
          close: 'إغلاق نموذج الدفع',
          title: 'تسجيل دفعة',
          description: 'تسجيل دفعة لـ {{description}}.',
          targetLabel: 'هدف الدفع',
          targetRemainingLabel: 'المتبقي من الهدف',
          debtRemainingLabel: 'المتبقي من الدين',
          amountLabel: 'مبلغ الدفع',
          amountPlaceholder: '0.00',
          payFull: 'دفع المبلغ المتبقي بالكامل',
          dateLabel: 'تاريخ الدفع',
          noteLabel: 'ملاحظة (اختياري)',
          notePlaceholder: 'أضف ملاحظة',
          previewTitle: 'بعد هذه الدفعة',
          targetAfterLabel: 'المتبقي من الهدف بعد الدفع',
          debtAfterLabel: 'المتبقي من الدين بعد الدفع',
          cancel: 'إلغاء',
          submit: 'تسجيل الدفعة',
          submitting: 'جارٍ التسجيل',
          targetUnavailable: 'لم يعد هدف الدفع هذا متاحًا.',
        },
        toast: {
          record: {
            successTitle: 'تم تسجيل الدفعة',
            successDescription: 'تم تسجيل الدفعة بنجاح.',
            errorTitle: 'تعذر تسجيل الدفعة',
          },
        },
        errors: paymentApiErrorTranslations.ar,
        validation: paymentValidationTranslations.ar,
      },
    },
  },
} satisfies Record<SupportedLocale, { common: { payments: Record<string, unknown> } }>;
