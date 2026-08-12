import { HttpException } from '@nestjs/common';
import { authApiErrorCode, authValidationCode } from '@collectify/contracts';
import { describe, expect, it } from 'vitest';

import { ownerSignInException, resolveOwnerSignInValidationMessage } from './owner-sign-in.errors';

describe('owner sign-in errors', () => {
  it('resolves sign-in validation codes to backend-owned messages', () => {
    expect(resolveOwnerSignInValidationMessage(authValidationCode.authEmailInvalid)).toBe(
      'Enter a valid email address.',
    );
    expect(resolveOwnerSignInValidationMessage(authValidationCode.authSignInPasswordRequired)).toBe(
      'Password is required.',
    );
  });

  it('passes through unknown validation messages unchanged', () => {
    expect(resolveOwnerSignInValidationMessage('Reference is required.')).toBe(
      'Reference is required.',
    );
  });

  it('creates the invalid credentials exception from the feature catalog', () => {
    const exception = ownerSignInException(authApiErrorCode.invalidCredentials);

    expect(exception).toBeInstanceOf(HttpException);
    expect(exception.getStatus()).toBe(401);
    expect(exception.getResponse()).toEqual({
      code: 'INVALID_CREDENTIALS',
      message: 'Email or password is incorrect.',
      fieldErrors: {
        email: ['Email or password is incorrect.'],
        password: ['Email or password is incorrect.'],
      },
    });
  });

  it('creates the owner profile missing exception from the feature catalog', () => {
    const exception = ownerSignInException(authApiErrorCode.ownerProfileMissing);

    expect(exception).toBeInstanceOf(HttpException);
    expect(exception.getStatus()).toBe(409);
    expect(exception.getResponse()).toEqual({
      code: 'OWNER_PROFILE_MISSING',
      message: 'Owner profile setup is incomplete.',
    });
  });
});
