export const paymentValidationCode = {
  paymentTargetScheduleItemIdRequired:
    'PAYMENT_TARGET_SCHEDULE_ITEM_ID_REQUIRED',
  paymentAmountInvalid: 'PAYMENT_AMOUNT_INVALID',
  paymentAmountTooLarge: 'PAYMENT_AMOUNT_TOO_LARGE',
  paymentDateInvalid: 'PAYMENT_DATE_INVALID',
  paymentNoteTooLong: 'PAYMENT_NOTE_TOO_LONG',
  paymentExpectedDebtVersionInvalid: 'PAYMENT_EXPECTED_DEBT_VERSION_INVALID',
  paymentIdempotencyKeyInvalid: 'PAYMENT_IDEMPOTENCY_KEY_INVALID',
} as const;

export const paymentValidationCodes = Object.values(paymentValidationCode);

export type PaymentValidationCode =
  (typeof paymentValidationCode)[keyof typeof paymentValidationCode];
