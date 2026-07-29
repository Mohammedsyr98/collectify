import { describe, expect, it } from 'vitest';

import {
  currencySchema,
  ownerLanguageSchema,
  sessionResponseSchema,
} from './index.js';

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
