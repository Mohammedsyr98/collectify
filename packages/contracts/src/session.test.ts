import { describe, expect, it } from 'vitest';

import {
  currencySchema,
  ownerLanguageSchema,
} from './owner-profile.js';
import {
  ownerSignInErrorResponseSchema,
  ownerSignInRequestSchema,
  ownerSignInResponseSchema,
  ownerSignUpErrorResponseSchema,
  ownerSignUpRequestSchema,
  ownerSignUpResponseSchema,
} from './owner-auth.js';
import { sessionResponseSchema } from './session.js';
import {
  getValidationErrorMessageFallback,
  validationErrorCode,
} from './validation.js';

describe('session contracts', () => {
  it('accepts a signed-out session response without user details', () => {
    expect(
      sessionResponseSchema.parse({
        authenticated: false,
        user: null,
        ownerProfile: null,
      }),
    ).toEqual({
      authenticated: false,
      user: null,
      ownerProfile: null,
    });
  });

  it('accepts an authenticated session response with owner setup details', () => {
    expect(
      sessionResponseSchema.parse({
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
      user: {
        email: 'owner@example.com',
      },
      ownerProfile: {
        preferredLanguage: 'tr',
        defaultCurrency: 'TRY',
      },
    });
  });

  it('rejects inconsistent session states', () => {
    expect(() =>
      sessionResponseSchema.parse({
        authenticated: false,
        user: {
          id: 'user_123',
          email: 'owner@example.com',
          name: null,
        },
        ownerProfile: null,
      }),
    ).toThrow();
  });

  it('limits setup enums to v1 supported values', () => {
    expect(ownerLanguageSchema.options).toEqual(['en', 'tr']);
    expect(currencySchema.options).toEqual(['TRY', 'USD', 'EUR']);
  });
});

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
      ['name', validationErrorCode.authNameRequired],
      ['email', validationErrorCode.authEmailInvalid],
      ['password', validationErrorCode.authSignUpPasswordLength],
      [
        'preferredLanguage',
        validationErrorCode.authPreferredLanguageUnsupported,
      ],
      ['defaultCurrency', validationErrorCode.authDefaultCurrencyUnsupported],
    ]);
  });

  it('provides English fallback messages for owner sign-up validation codes', () => {
    expect(
      getValidationErrorMessageFallback(validationErrorCode.authNameRequired),
    ).toBe('Name is required.');
    expect(
      getValidationErrorMessageFallback(validationErrorCode.authEmailInvalid),
    ).toBe('Enter a valid email address.');
    expect(
      getValidationErrorMessageFallback(
        validationErrorCode.authSignUpPasswordLength,
      ),
    ).toBe('Password must be between 8 and 128 characters.');
    expect(
      getValidationErrorMessageFallback(
        validationErrorCode.authPreferredLanguageUnsupported,
      ),
    ).toBe('Choose English or Turkish.');
    expect(
      getValidationErrorMessageFallback(
        validationErrorCode.authDefaultCurrencyUnsupported,
      ),
    ).toBe('Choose TRY, USD, or EUR.');
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

  it('accepts controlled owner sign-up errors', () => {
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
      ['email', validationErrorCode.authEmailInvalid],
      ['password', validationErrorCode.authSignInPasswordRequired],
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

  it('accepts controlled owner sign-in errors', () => {
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
