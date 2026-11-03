import { HttpException, HttpStatus } from '@nestjs/common';
import { paymentApiErrorCode, type PaymentApiErrorCode } from '@collectify/contracts';

const paymentApiErrors = {
  [paymentApiErrorCode.paymentTargetNotFound]: {
    message: 'Payment target was not found.',
    status: HttpStatus.NOT_FOUND,
  },
  [paymentApiErrorCode.paymentDateInFuture]: {
    message: 'Payment date cannot be in the future.',
    status: HttpStatus.BAD_REQUEST,
  },
  [paymentApiErrorCode.paymentTargetAlreadyPaid]: {
    message: 'This payment target is already paid.',
    status: HttpStatus.CONFLICT,
  },
  [paymentApiErrorCode.paymentAmountExceedsRemaining]: {
    message: 'Payment amount exceeds the remaining target amount.',
    status: HttpStatus.CONFLICT,
  },
  [paymentApiErrorCode.paymentDebtVersionConflict]: {
    message: 'The debt was changed by another request.',
    status: HttpStatus.CONFLICT,
  },
  [paymentApiErrorCode.paymentIdempotencyKeyReused]: {
    message: 'The idempotency key was already used for another request.',
    status: HttpStatus.CONFLICT,
  },
} as const;

export function paymentException(
  code: Exclude<PaymentApiErrorCode, typeof paymentApiErrorCode.validationError>,
): HttpException {
  const error = paymentApiErrors[code];

  return new HttpException(
    { code, message: error.message },
    error.status,
  );
}
