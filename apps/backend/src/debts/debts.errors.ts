import { HttpException, HttpStatus } from '@nestjs/common';
import {
  debtApiErrorCode,
  debtValidationCode,
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
} as const;

const debtValidationMessages = {
  [debtValidationCode.debtDescriptionRequired]: 'Description is required.',
  [debtValidationCode.debtDescriptionTooLong]:
    'Description must be 200 characters or fewer.',
  [debtValidationCode.debtDueDateInvalid]: 'Enter a valid due date.',
  [debtValidationCode.debtDueDateRequired]: 'Due date is required.',
  [debtValidationCode.debtTotalAmountInvalid]: 'Enter a valid amount.',
  [debtValidationCode.debtTotalAmountTooLarge]: 'Amount is too large.',
  [debtValidationCode.debtTotalAmountMustBePositive]:
    'Amount must be greater than zero.',
} satisfies Record<DebtValidationCode, string>;

export function resolveDebtValidationMessage(message: string): string {
  if (isDebtValidationCode(message)) {
    return debtValidationMessages[message];
  }

  return message;
}

export function debtException(
  code: typeof debtApiErrorCode.debtNotFound,
): HttpException {
  const error = debtApiErrors[code];

  return new HttpException(error.response, error.status);
}
