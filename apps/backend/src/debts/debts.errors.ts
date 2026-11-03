import { HttpException, HttpStatus } from '@nestjs/common';
import {
  debtApiErrorCode,
  debtPlanIssueCode,
  debtRequestValidationCode,
  isDebtValidationCode,
  type DebtValidationCode,
} from '@collectify/contracts';

const debtApiErrors = {
  [debtApiErrorCode.debtNotFound]: {
    response: {
      code: debtApiErrorCode.debtNotFound,
      message: 'Debt was not found.',
    },
    status: HttpStatus.NOT_FOUND,
  },
  [debtApiErrorCode.debtVersionConflict]: {
    response: {
      code: debtApiErrorCode.debtVersionConflict,
      message: 'Debt was changed by another request.',
    },
    status: HttpStatus.CONFLICT,
  },
  [debtApiErrorCode.debtHasPayments]: {
    response: {
      code: debtApiErrorCode.debtHasPayments,
      message: 'A debt with recorded payments cannot be deleted.',
    },
    status: HttpStatus.CONFLICT,
  },
  [debtApiErrorCode.debtCurrencyChangeBlocked]: {
    response: {
      code: debtApiErrorCode.debtCurrencyChangeBlocked,
      message: 'Currency cannot be changed after a payment is recorded.',
    },
    status: HttpStatus.CONFLICT,
  },
  [debtApiErrorCode.debtPaymentPlanChangeBlocked]: {
    response: {
      code: debtApiErrorCode.debtPaymentPlanChangeBlocked,
      message: 'Payment plan cannot be changed after a payment is recorded.',
    },
    status: HttpStatus.CONFLICT,
  },
  [debtApiErrorCode.debtScheduleItemHasPayments]: {
    response: {
      code: debtApiErrorCode.debtScheduleItemHasPayments,
      message: 'A schedule item with recorded payments cannot be removed.',
    },
    status: HttpStatus.CONFLICT,
  },
  [debtApiErrorCode.debtScheduleItemAmountBelowPaid]: {
    response: {
      code: debtApiErrorCode.debtScheduleItemAmountBelowPaid,
      message: 'A schedule item amount cannot be reduced below payments received.',
    },
    status: HttpStatus.CONFLICT,
  },
  [debtApiErrorCode.debtTotalAmountBelowPaid]: {
    response: {
      code: debtApiErrorCode.debtTotalAmountBelowPaid,
      message: 'Debt total cannot be reduced below payments received.',
    },
    status: HttpStatus.CONFLICT,
  },
} as const;

const debtValidationMessages = {
  [debtRequestValidationCode.debtDescriptionRequired]: 'Description is required.',
  [debtRequestValidationCode.debtDescriptionTooLong]:
    'Description must be 200 characters or fewer.',
  [debtRequestValidationCode.debtDueDateInvalid]: 'Enter a valid due date.',
  [debtRequestValidationCode.debtDueDateRequired]: 'Due date is required.',
  [debtPlanIssueCode.scheduleItemAmountDoesNotMatchTotal]:
    'Payment amount must match the debt total.',
  [debtPlanIssueCode.scheduleTotalAmountMismatch]:
    'Payment amounts must match the debt total.',
  [debtRequestValidationCode.debtScheduleItemAmountInvalid]:
    'Enter a valid payment amount.',
  [debtRequestValidationCode.debtScheduleItemIdDuplicate]:
    'Schedule items must use distinct saved IDs.',
  [debtPlanIssueCode.scheduleItemAmountNotPositive]:
    'Payment amount must be greater than zero.',
  [debtPlanIssueCode.scheduleItemCountInvalid]:
    'A one-payment debt must contain exactly one payment.',
  [debtPlanIssueCode.scheduleItemDueDateInvalid]:
    'Enter a valid due date.',
  [debtPlanIssueCode.scheduleItemDueDateNotAfterPrevious]:
    'Payment dates must be in increasing order.',
  [debtRequestValidationCode.debtTotalAmountInvalid]: 'Enter a valid amount.',
  [debtRequestValidationCode.debtTotalAmountTooLarge]: 'Amount is too large.',
} satisfies Record<DebtValidationCode, string>;

export function resolveDebtValidationMessage(message: string): string {
  if (isDebtValidationCode(message)) {
    return debtValidationMessages[message];
  }

  return message;
}

export function debtException(
  code:
    | typeof debtApiErrorCode.debtNotFound
    | typeof debtApiErrorCode.debtVersionConflict
    | typeof debtApiErrorCode.debtHasPayments
    | typeof debtApiErrorCode.debtCurrencyChangeBlocked
    | typeof debtApiErrorCode.debtPaymentPlanChangeBlocked
    | typeof debtApiErrorCode.debtScheduleItemHasPayments
    | typeof debtApiErrorCode.debtScheduleItemAmountBelowPaid
    | typeof debtApiErrorCode.debtTotalAmountBelowPaid,
): HttpException {
  const error = debtApiErrors[code];

  return new HttpException(error.response, error.status);
}
