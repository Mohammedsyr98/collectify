import { describe, expect, it } from 'vitest';

import {
  authApiErrorCode,
  authApiErrorCodes,
  authValidationCode,
  authValidationCodes,
  isAuthApiErrorCode,
  isAuthValidationCode,
  isOwnerSignInApiErrorCode,
  isOwnerSignUpApiErrorCode,
  ownerSignInApiErrorCodes,
  ownerSignUpApiErrorCodes,
} from './auth-codes.js';

describe('auth semantic code contracts', () => {
  it('exports stable auth validation codes', () => {
    expect(authValidationCodes).toEqual([
      'AUTH_DEFAULT_CURRENCY_UNSUPPORTED',
      'AUTH_EMAIL_INVALID',
      'AUTH_NAME_REQUIRED',
      'AUTH_PREFERRED_LANGUAGE_UNSUPPORTED',
      'AUTH_SIGN_IN_PASSWORD_REQUIRED',
      'AUTH_SIGN_UP_PASSWORD_LENGTH',
    ]);
    expect(isAuthValidationCode(authValidationCode.authEmailInvalid)).toBe(
      true,
    );
    expect(isAuthValidationCode('Name is required.')).toBe(false);
  });

  it('exports stable auth API error codes and route subsets', () => {
    expect(authApiErrorCodes).toEqual([
      'VALIDATION_ERROR',
      'INVALID_CREDENTIALS',
      'OWNER_PROFILE_MISSING',
      'ACCOUNT_ALREADY_EXISTS',
      'PROFILE_SETUP_FAILED',
    ]);
    expect(ownerSignInApiErrorCodes).toEqual([
      'VALIDATION_ERROR',
      'INVALID_CREDENTIALS',
      'OWNER_PROFILE_MISSING',
    ]);
    expect(ownerSignUpApiErrorCodes).toEqual([
      'VALIDATION_ERROR',
      'ACCOUNT_ALREADY_EXISTS',
      'PROFILE_SETUP_FAILED',
    ]);
    expect(isAuthApiErrorCode(authApiErrorCode.validationError)).toBe(true);
    expect(isOwnerSignInApiErrorCode(authApiErrorCode.invalidCredentials)).toBe(
      true,
    );
    expect(isOwnerSignInApiErrorCode(authApiErrorCode.accountAlreadyExists)).toBe(
      false,
    );
    expect(isOwnerSignUpApiErrorCode(authApiErrorCode.accountAlreadyExists)).toBe(
      true,
    );
    expect(isOwnerSignUpApiErrorCode('SOMETHING_ELSE')).toBe(false);
  });
});
