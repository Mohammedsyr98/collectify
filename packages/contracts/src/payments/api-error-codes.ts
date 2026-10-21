export const paymentApiErrorCode = {
  validationError: 'VALIDATION_ERROR',
  paymentTargetNotFound: 'PAYMENT_TARGET_NOT_FOUND',
  paymentDateInFuture: 'PAYMENT_DATE_IN_FUTURE',
  paymentTargetAlreadyPaid: 'PAYMENT_TARGET_ALREADY_PAID',
  paymentAmountExceedsRemaining: 'PAYMENT_AMOUNT_EXCEEDS_REMAINING',
  paymentDebtVersionConflict: 'PAYMENT_DEBT_VERSION_CONFLICT',
  paymentIdempotencyKeyReused: 'PAYMENT_IDEMPOTENCY_KEY_REUSED',
} as const;

export const paymentApiErrorCodes = [
  paymentApiErrorCode.validationError,
  paymentApiErrorCode.paymentTargetNotFound,
  paymentApiErrorCode.paymentDateInFuture,
  paymentApiErrorCode.paymentTargetAlreadyPaid,
  paymentApiErrorCode.paymentAmountExceedsRemaining,
  paymentApiErrorCode.paymentDebtVersionConflict,
  paymentApiErrorCode.paymentIdempotencyKeyReused,
] as const;

export type PaymentApiErrorCode = (typeof paymentApiErrorCodes)[number];

const paymentApiErrorCodeSet = new Set<string>(paymentApiErrorCodes);

export function isPaymentApiErrorCode(
  code: string | undefined,
): code is PaymentApiErrorCode {
  return typeof code === 'string' && paymentApiErrorCodeSet.has(code);
}
