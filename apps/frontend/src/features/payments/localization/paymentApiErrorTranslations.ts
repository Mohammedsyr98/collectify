import {
  paymentApiErrorCode,
  type PaymentApiErrorCode,
} from '@collectify/contracts';

import type { SupportedLocale } from '@/shared/localization';

type PaymentApiErrorTranslationMessages = Record<PaymentApiErrorCode, string>;

export const paymentApiErrorTranslations = {
  en: {
    [paymentApiErrorCode.validationError]: 'Check the highlighted fields.',
    [paymentApiErrorCode.paymentTargetNotFound]: 'The payment target was not found.',
    [paymentApiErrorCode.paymentDateInFuture]: 'Payment date cannot be in the future.',
    [paymentApiErrorCode.paymentTargetAlreadyPaid]: 'This payment target is already paid.',
    [paymentApiErrorCode.paymentAmountExceedsRemaining]: 'Payment exceeds the target remaining amount.',
    [paymentApiErrorCode.paymentDebtVersionConflict]: 'The debt changed while you were editing. Refresh the page to load the latest details before trying again.',
    [paymentApiErrorCode.paymentIdempotencyKeyReused]: 'We couldn\'t submit the payment. Refresh the page and try again.',
    [paymentApiErrorCode.paymentNotFound]: 'The payment was not found. Refresh the page and try again.',
  },
  tr: {
    [paymentApiErrorCode.validationError]: 'Vurgulanan alanları kontrol edin.',
    [paymentApiErrorCode.paymentTargetNotFound]: 'Ödeme hedefi bulunamadı.',
    [paymentApiErrorCode.paymentDateInFuture]: 'Ödeme tarihi gelecekte olamaz.',
    [paymentApiErrorCode.paymentTargetAlreadyPaid]: 'Bu ödeme hedefi zaten ödendi.',
    [paymentApiErrorCode.paymentAmountExceedsRemaining]: 'Ödeme hedefin kalan tutarını aşıyor.',
    [paymentApiErrorCode.paymentDebtVersionConflict]: 'Siz düzenlerken borç değişti. Tekrar denemeden önce güncel bilgileri yüklemek için sayfayı yenileyin.',
    [paymentApiErrorCode.paymentIdempotencyKeyReused]: 'Ödeme gönderilemedi. Sayfayı yenileyip tekrar deneyin.',
    [paymentApiErrorCode.paymentNotFound]: 'Ödeme bulunamadı. Sayfayı yenileyip tekrar deneyin.',
  },
  ar: {
    [paymentApiErrorCode.validationError]: 'تحقق من الحقول المميزة.',
    [paymentApiErrorCode.paymentTargetNotFound]: 'لم يتم العثور على هدف الدفع.',
    [paymentApiErrorCode.paymentDateInFuture]: 'لا يمكن أن يكون تاريخ الدفع في المستقبل.',
    [paymentApiErrorCode.paymentTargetAlreadyPaid]: 'هدف الدفع هذا مدفوع بالفعل.',
    [paymentApiErrorCode.paymentAmountExceedsRemaining]: 'يتجاوز الدفع المبلغ المتبقي للهدف.',
    [paymentApiErrorCode.paymentDebtVersionConflict]: 'تغير الدين أثناء التحرير. حدّث الصفحة لتحميل أحدث التفاصيل قبل المحاولة مرة أخرى.',
    [paymentApiErrorCode.paymentIdempotencyKeyReused]: 'تعذر إرسال الدفعة. حدّث الصفحة ثم حاول مرة أخرى.',
    [paymentApiErrorCode.paymentNotFound]: 'لم يتم العثور على الدفعة. حدّث الصفحة ثم حاول مرة أخرى.',
  },
} satisfies Record<SupportedLocale, PaymentApiErrorTranslationMessages>;
