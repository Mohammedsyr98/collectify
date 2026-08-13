import { describe, expect, it } from 'vitest';

import { authApiErrorCode } from './api-error-codes.js';
import {
  isOwnerSignUpApiErrorCode,
  ownerSignUpApiErrorCodes,
  ownerSignUpErrorResponseSchema,
  ownerSignUpRequestSchema,
  ownerSignUpResponseSchema,
} from './owner-sign-up.js';
import { authValidationCode } from './validation-codes.js';

describe('owner sign-up contracts', () => {
  it('accepts a valid owner sign-up request and normalizes text inputs', () => {
    expect(
      ownerSignUpRequestSchema.parse({
        name: '  Owner  ',
        email: '  OWNER@EXAMPLE.COM  ',
        password: 'password123',
        preferredLanguage: 'en',
        defaultCurrency: 'USD',
      }),
    ).toEqual({
      name: 'Owner',
      email: 'owner@example.com',
      password: 'password123',
      preferredLanguage: 'en',
      defaultCurrency: 'USD',
    });
  });

  it('rejects invalid owner setup input', () => {
    expect(() =>
      ownerSignUpRequestSchema.parse({
        name: '',
        email: 'not-an-email',
        password: 'short',
        preferredLanguage: 'fr',
        defaultCurrency: 'GBP',
      }),
    ).toThrow();
  });

  it('returns stable owner sign-up validation codes', () => {
    const result = ownerSignUpRequestSchema.safeParse({
      name: '',
      email: 'not-an-email',
      password: 'short',
      preferredLanguage: 'fr',
      defaultCurrency: 'GBP',
    });

    expect(result.success).toBe(false);

    if (result.success) {
      return;
    }

    expect(
      result.error.issues.map((issue) => [issue.path[0], issue.message]),
    ).toEqual([
      ['name', authValidationCode.authNameRequired],
      ['email', authValidationCode.authEmailInvalid],
      ['password', authValidationCode.authSignUpPasswordLength],
      [
        'preferredLanguage',
        authValidationCode.authPreferredLanguageUnsupported,
      ],
      ['defaultCurrency', authValidationCode.authDefaultCurrencyUnsupported],
    ]);
  });

  it('requires owner profile context on successful sign-up', () => {
    expect(
      ownerSignUpResponseSchema.parse({
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
      ownerSignUpResponseSchema.parse({
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

  it('exports controlled owner sign-up errors', () => {
    expect(ownerSignUpApiErrorCodes).toEqual([
      'VALIDATION_ERROR',
      'ACCOUNT_ALREADY_EXISTS',
      'PROFILE_SETUP_FAILED',
    ]);
    expect(
      isOwnerSignUpApiErrorCode(authApiErrorCode.accountAlreadyExists),
    ).toBe(true);
    expect(isOwnerSignUpApiErrorCode(authApiErrorCode.invalidCredentials)).toBe(
      false,
    );
    expect(isOwnerSignUpApiErrorCode('SOMETHING_ELSE')).toBe(false);
  });

  it('accepts controlled owner sign-up error responses', () => {
    expect(
      ownerSignUpErrorResponseSchema.parse({
        code: 'VALIDATION_ERROR',
        message: 'Check the highlighted fields.',
        fieldErrors: {
          email: ['Enter a valid email address.'],
          password: ['Password must be at least 8 characters.'],
        },
      }),
    ).toMatchObject({
      code: 'VALIDATION_ERROR',
      fieldErrors: {
        email: ['Enter a valid email address.'],
      },
    });
  });
});
