import { HttpException, HttpStatus } from '@nestjs/common';
import {
  authApiErrorCode,
  authValidationCode,
  type OwnerSignInErrorCode,
  type OwnerSignInErrorResponse,
} from '@collectify/contracts';

type OwnerSignInValidationCode =
  typeof authValidationCode.authEmailInvalid | typeof authValidationCode.authSignInPasswordRequired;

const ownerSignInValidationMessages = {
  [authValidationCode.authEmailInvalid]: 'Enter a valid email address.',
  [authValidationCode.authSignInPasswordRequired]: 'Password is required.',
} satisfies Record<OwnerSignInValidationCode, string>;

type OwnerSignInApiErrorCatalog = {
  [Code in OwnerSignInErrorCode]: {
    response: OwnerSignInErrorResponse & { code: Code };
    status: HttpStatus;
  };
};

const invalidCredentialsMessage = 'Email or password is incorrect.';

const ownerSignInApiErrors = {
  [authApiErrorCode.validationError]: {
    response: {
      code: authApiErrorCode.validationError,
      message: 'Check the highlighted fields.',
    },
    status: HttpStatus.BAD_REQUEST,
  },
  [authApiErrorCode.invalidCredentials]: {
    response: {
      code: authApiErrorCode.invalidCredentials,
      message: invalidCredentialsMessage,
      fieldErrors: {
        email: [invalidCredentialsMessage],
        password: [invalidCredentialsMessage],
      },
    },
    status: HttpStatus.UNAUTHORIZED,
  },
  [authApiErrorCode.ownerProfileMissing]: {
    response: {
      code: authApiErrorCode.ownerProfileMissing,
      message: 'Owner profile setup is incomplete.',
    },
    status: HttpStatus.CONFLICT,
  },
} satisfies OwnerSignInApiErrorCatalog;

export function resolveOwnerSignInValidationMessage(message: string): string {
  if (isOwnerSignInValidationCode(message)) {
    return ownerSignInValidationMessages[message];
  }

  return message;
}

export function ownerSignInException(code: OwnerSignInErrorCode): HttpException {
  const error = ownerSignInApiErrors[code];

  return new HttpException(error.response, error.status);
}

function isOwnerSignInValidationCode(message: string): message is OwnerSignInValidationCode {
  return Object.hasOwn(ownerSignInValidationMessages, message);
}
