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
    | typeof debtApiErrorCode.debtVersionConflict,
): HttpException {
  const error = debtApiErrors[code];

  return new HttpException(error.response, error.status);
}
