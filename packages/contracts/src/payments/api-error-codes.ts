import { paymentIssueCode } from '@collectify/domain/payment';

type PaymentDomainIssueCode =
  (typeof paymentIssueCode)[keyof typeof paymentIssueCode];

export const paymentApiErrorCode = {
  validationError: 'VALIDATION_ERROR',
  paymentTargetNotFound: 'PAYMENT_TARGET_NOT_FOUND',
  paymentDateInFuture: paymentIssueCode.paymentDateInFuture,
  paymentTargetAlreadyPaid: 'PAYMENT_TARGET_ALREADY_PAID',
  paymentAmountExceedsRemaining: paymentIssueCode.paymentAmountExceedsRemaining,
  paymentDebtVersionConflict: 'PAYMENT_DEBT_VERSION_CONFLICT',
  paymentIdempotencyKeyReused: 'PAYMENT_IDEMPOTENCY_KEY_REUSED',
} as const satisfies
  Record<keyof typeof paymentIssueCode, PaymentDomainIssueCode> &
    Record<string, string>;

export type PaymentApiErrorCode =
  (typeof paymentApiErrorCode)[keyof typeof paymentApiErrorCode];

function getNonEmptyObjectValues<T extends Record<string, string>>(
  object: T,
): readonly [T[keyof T], ...T[keyof T][]] {
  const values = Object.values(object) as T[keyof T][];
  const [firstValue, ...remainingValues] = values;

  if (firstValue === undefined) {
    throw new Error('Expected at least one object value');
  }

  return [firstValue, ...remainingValues];
}

export const paymentApiErrorCodes =
  getNonEmptyObjectValues(paymentApiErrorCode);

const paymentApiErrorCodeSet = new Set<string>(paymentApiErrorCodes);

export function isPaymentApiErrorCode(
  code: string | undefined,
): code is PaymentApiErrorCode {
  return typeof code === 'string' && paymentApiErrorCodeSet.has(code);
}
