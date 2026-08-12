import { HttpException } from '@nestjs/common';
import { authApiErrorCode, authValidationCode } from '@collectify/contracts';
import { describe, expect, it } from 'vitest';

import { ownerSignUpException, resolveOwnerSignUpValidationMessage } from './owner-sign-up.errors';

describe('owner sign-up errors', () => {
  it('resolves sign-up validation codes to backend-owned messages', () => {
    expect(
      resolveOwnerSignUpValidationMessage(authValidationCode.authDefaultCurrencyUnsupported),
    ).toBe('Choose TRY, USD, or EUR.');
    expect(resolveOwnerSignUpValidationMessage(authValidationCode.authEmailInvalid)).toBe(
      'Enter a valid email address.',
    );
    expect(resolveOwnerSignUpValidationMessage(authValidationCode.authNameRequired)).toBe(
      'Name is required.',
    );
    expect(
      resolveOwnerSignUpValidationMessage(authValidationCode.authPreferredLanguageUnsupported),
    ).toBe('Choose English or Turkish.');
    expect(resolveOwnerSignUpValidationMessage(authValidationCode.authSignUpPasswordLength)).toBe(
      'Password must be between 8 and 128 characters.',
    );
  });

  it('passes through unknown validation messages unchanged', () => {
    expect(resolveOwnerSignUpValidationMessage('Reference is required.')).toBe(
      'Reference is required.',
    );
  });

  it('creates the account already exists exception from the feature catalog', () => {
    const exception = ownerSignUpException(authApiErrorCode.accountAlreadyExists);

    expect(exception).toBeInstanceOf(HttpException);
    expect(exception.getStatus()).toBe(409);
    expect(exception.getResponse()).toEqual({
      code: 'ACCOUNT_ALREADY_EXISTS',
      message: 'An account already exists for this email.',
      fieldErrors: {
        email: ['An account already exists for this email.'],
      },
    });
  });

  it('creates the profile setup failed exception from the feature catalog', () => {
    const exception = ownerSignUpException(authApiErrorCode.profileSetupFailed);

    expect(exception).toBeInstanceOf(HttpException);
    expect(exception.getStatus()).toBe(500);
    expect(exception.getResponse()).toEqual({
      code: 'PROFILE_SETUP_FAILED',
      message: 'We could not finish owner setup. Try again.',
    });
  });
});
