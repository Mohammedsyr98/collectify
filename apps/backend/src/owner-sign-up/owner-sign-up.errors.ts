import { HttpException, HttpStatus } from '@nestjs/common';
import {
  authApiErrorCode,
  authValidationCode,
  type OwnerSignUpErrorCode,
  type OwnerSignUpErrorResponse,
} from '@collectify/contracts';

type OwnerSignUpValidationCode =
  | typeof authValidationCode.authDefaultCurrencyUnsupported
  | typeof authValidationCode.authEmailInvalid
  | typeof authValidationCode.authNameRequired
  | typeof authValidationCode.authPreferredLanguageUnsupported
  | typeof authValidationCode.authSignUpPasswordLength;

const ownerSignUpValidationMessages = {
  [authValidationCode.authDefaultCurrencyUnsupported]: 'Choose TRY, USD, or EUR.',
  [authValidationCode.authEmailInvalid]: 'Enter a valid email address.',
  [authValidationCode.authNameRequired]: 'Name is required.',
  [authValidationCode.authPreferredLanguageUnsupported]: 'Choose English or Turkish.',
  [authValidationCode.authSignUpPasswordLength]: 'Password must be between 8 and 128 characters.',
} satisfies Record<OwnerSignUpValidationCode, string>;

type OwnerSignUpApiErrorCatalog = {
  [Code in OwnerSignUpErrorCode]: {
    response: OwnerSignUpErrorResponse & { code: Code };
    status: HttpStatus;
  };
};

const accountAlreadyExistsMessage = 'An account already exists for this email.';

const ownerSignUpApiErrors = {
  [authApiErrorCode.validationError]: {
    response: {
      code: authApiErrorCode.validationError,
      message: 'Check the highlighted fields.',
    },
    status: HttpStatus.BAD_REQUEST,
  },
  [authApiErrorCode.accountAlreadyExists]: {
    response: {
      code: authApiErrorCode.accountAlreadyExists,
      message: accountAlreadyExistsMessage,
      fieldErrors: {
        email: [accountAlreadyExistsMessage],
      },
    },
    status: HttpStatus.CONFLICT,
  },
  [authApiErrorCode.profileSetupFailed]: {
    response: {
      code: authApiErrorCode.profileSetupFailed,
      message: 'We could not finish owner setup. Try again.',
    },
    status: HttpStatus.INTERNAL_SERVER_ERROR,
  },
} satisfies OwnerSignUpApiErrorCatalog;

export function resolveOwnerSignUpValidationMessage(message: string): string {
  if (isOwnerSignUpValidationCode(message)) {
    return ownerSignUpValidationMessages[message];
  }

  return message;
}

export function ownerSignUpException(code: OwnerSignUpErrorCode): HttpException {
  const error = ownerSignUpApiErrors[code];

  return new HttpException(error.response, error.status);
}

function isOwnerSignUpValidationCode(message: string): message is OwnerSignUpValidationCode {
  return Object.hasOwn(ownerSignUpValidationMessages, message);
}
