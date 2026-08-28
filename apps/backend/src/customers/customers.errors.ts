import { HttpException, HttpStatus } from '@nestjs/common';
import {
  customerApiErrorCode,
  customerValidationCode,
  type CustomerErrorCode,
  type CustomerErrorResponse,
} from '@collectify/contracts';

type CustomerValidationCode =
  | typeof customerValidationCode.customerCodeRequired
  | typeof customerValidationCode.customerNameRequired
  | typeof customerValidationCode.customerPhoneNumberRequired;

const customerValidationMessages = {
  [customerValidationCode.customerCodeRequired]: 'Customer code is required.',
  [customerValidationCode.customerNameRequired]: 'Customer name is required.',
  [customerValidationCode.customerPhoneNumberRequired]:
    'Phone number is required.',
} satisfies Record<CustomerValidationCode, string>;

type CustomerApiErrorCatalog = {
  [Code in CustomerErrorCode]: {
    response: CustomerErrorResponse & { code: Code };
    status: HttpStatus;
  };
};

const duplicateCodeMessage = 'A customer with this code already exists.';

const customerApiErrors = {
  [customerApiErrorCode.validationError]: {
    response: {
      code: customerApiErrorCode.validationError,
      message: 'Check the highlighted fields.',
    },
    status: HttpStatus.BAD_REQUEST,
  },
  [customerApiErrorCode.customerCodeAlreadyExists]: {
    response: {
      code: customerApiErrorCode.customerCodeAlreadyExists,
      message: duplicateCodeMessage,
      fieldErrors: {
        code: [duplicateCodeMessage],
      },
    },
    status: HttpStatus.CONFLICT,
  },
  [customerApiErrorCode.customerNotFound]: {
    response: {
      code: customerApiErrorCode.customerNotFound,
      message: 'Customer was not found.',
    },
    status: HttpStatus.NOT_FOUND,
  },
} satisfies CustomerApiErrorCatalog;

export function resolveCustomerValidationMessage(message: string): string {
  if (isCustomerValidationCode(message)) {
    return customerValidationMessages[message];
  }

  return message;
}

export function customerException(code: CustomerErrorCode): HttpException {
  const error = customerApiErrors[code];

  return new HttpException(error.response, error.status);
}

function isCustomerValidationCode(
  message: string,
): message is CustomerValidationCode {
  return Object.hasOwn(customerValidationMessages, message);
}
