import { afterEach, describe, expect, it, vi } from 'vitest';

import { getBackendUrl } from '../../../shared/api/http';
import { signUpOwner } from './sign-up-owner';

describe('owner sign-up API', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('posts owner setup with credentials included', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
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
      }),
    );

    await expect(
      signUpOwner({
        name: 'Owner',
        email: 'owner@example.com',
        password: 'password123',
        preferredLanguage: 'tr',
        defaultCurrency: 'TRY',
      }),
    ).resolves.toMatchObject({
      authenticated: true,
      ownerProfile: {
        preferredLanguage: 'tr',
        defaultCurrency: 'TRY',
      },
    });

    expect(fetch).toHaveBeenCalledWith(`${getBackendUrl()}/owner/sign-up`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Owner',
        email: 'owner@example.com',
        password: 'password123',
        preferredLanguage: 'tr',
        defaultCurrency: 'TRY',
      }),
    });
  });

  it('throws controlled owner sign-up errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 409,
        json: async () => ({
          code: 'ACCOUNT_ALREADY_EXISTS',
          message: 'An account already exists for this email.',
          fieldErrors: {
            email: ['An account already exists for this email.'],
          },
        }),
      }),
    );

    await expect(
      signUpOwner({
        name: 'Owner',
        email: 'owner@example.com',
        password: 'password123',
        preferredLanguage: 'en',
        defaultCurrency: 'USD',
      }),
    ).rejects.toMatchObject({
      status: 409,
      code: 'ACCOUNT_ALREADY_EXISTS',
      fieldErrors: {
        email: ['An account already exists for this email.'],
      },
    });
  });

  it('throws an ApiError when owner sign-up returns an unexpected body', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => {
          throw new SyntaxError('Unexpected end of JSON input');
        },
      }),
    );

    await expect(
      signUpOwner({
        name: 'Owner',
        email: 'owner@example.com',
        password: 'password123',
        preferredLanguage: 'en',
        defaultCurrency: 'USD',
      }),
    ).rejects.toMatchObject({
      status: 500,
      message: 'Owner sign-up failed with status 500',
    });
  });
});
