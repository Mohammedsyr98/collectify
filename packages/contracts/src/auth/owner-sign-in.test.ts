import { describe, expect, it } from 'vitest';

import { authApiErrorCode } from './api-error-codes.js';
import {
  isOwnerSignInApiErrorCode,
  ownerSignInApiErrorCodes,
  ownerSignInErrorResponseSchema,
  ownerSignInRequestSchema,
  ownerSignInResponseSchema,
} from './owner-sign-in.js';
import { authValidationCode } from './validation-codes.js';

describe('owner sign-in contracts', () => {
  it('accepts a valid owner sign-in request and normalizes email', () => {
    expect(
      ownerSignInRequestSchema.parse({
        email: '  OWNER@EXAMPLE.COM  ',
        password: 'password123',
      }),
    ).toEqual({
      email: 'owner@example.com',
      password: 'password123',
    });
  });

  it('returns stable owner sign-in validation codes', () => {
    const result = ownerSignInRequestSchema.safeParse({
      email: 'not-an-email',
      password: '',
    });

    expect(result.success).toBe(false);

    if (result.success) {
      return;
    }

    expect(
      result.error.issues.map((issue) => [issue.path[0], issue.message]),
    ).toEqual([
      ['email', authValidationCode.authEmailInvalid],
      ['password', authValidationCode.authSignInPasswordRequired],
    ]);
  });

  it('requires owner profile context on successful sign-in', () => {
    expect(
      ownerSignInResponseSchema.parse({
        authenticated: true,
        user: {
          id: 'user_123',
          email: 'owner@example.com',
          name: 'Owner',
        },
        ownerProfile: {
          preferredLanguage: 'tr',
          defaultCurrency: 'TRY',
        },
      }),
    ).toMatchObject({
      authenticated: true,
      ownerProfile: {
        preferredLanguage: 'tr',
        defaultCurrency: 'TRY',
      },
    });

    expect(() =>
      ownerSignInResponseSchema.parse({
        authenticated: true,
        user: {
          id: 'user_123',
          email: 'owner@example.com',
          name: 'Owner',
        },
        ownerProfile: null,
      }),
    ).toThrow();
  });

  it('exports controlled owner sign-in errors', () => {
    expect(ownerSignInApiErrorCodes).toEqual([
      'VALIDATION_ERROR',
      'INVALID_CREDENTIALS',
      'OWNER_PROFILE_MISSING',
    ]);
    expect(isOwnerSignInApiErrorCode(authApiErrorCode.invalidCredentials)).toBe(
      true,
    );
    expect(
      isOwnerSignInApiErrorCode(authApiErrorCode.accountAlreadyExists),
    ).toBe(false);
    expect(isOwnerSignInApiErrorCode('SOMETHING_ELSE')).toBe(false);
  });

  it('accepts controlled owner sign-in error responses', () => {
    expect(
      ownerSignInErrorResponseSchema.parse({
        code: 'INVALID_CREDENTIALS',
        message: 'Email or password is incorrect.',
        fieldErrors: {
          email: ['Email or password is incorrect.'],
        },
      }),
    ).toMatchObject({
      code: 'INVALID_CREDENTIALS',
      fieldErrors: {
        email: ['Email or password is incorrect.'],
      },
    });

    expect(
      ownerSignInErrorResponseSchema.parse({
        code: 'OWNER_PROFILE_MISSING',
        message: 'Owner profile setup is incomplete.',
      }),
    ).toMatchObject({
      code: 'OWNER_PROFILE_MISSING',
    });
  });
});
