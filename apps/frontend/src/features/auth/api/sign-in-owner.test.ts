import { afterEach, describe, expect, it, vi } from 'vitest';

import { getBackendUrl } from '../../../shared/api/http';
import { signInOwner } from './sign-in-owner';

describe('owner sign-in API', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('posts owner credentials with cookies included', async () => {
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
      signInOwner({
        email: 'owner@example.com',
        password: 'password123',
      }),
    ).resolves.toMatchObject({
      authenticated: true,
      ownerProfile: {
        preferredLanguage: 'tr',
        defaultCurrency: 'TRY',
      },
    });

    expect(fetch).toHaveBeenCalledWith(`${getBackendUrl()}/owner/sign-in`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        email: 'owner@example.com',
        password: 'password123',
      }),
    });
  });

  it('throws controlled owner sign-in errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({
          code: 'INVALID_CREDENTIALS',
          message: 'Email or password is incorrect.',
          fieldErrors: {
            email: ['Email or password is incorrect.'],
          },
        }),
      }),
    );

    await expect(
      signInOwner({
        email: 'owner@example.com',
        password: 'wrong-password',
      }),
    ).rejects.toMatchObject({
      status: 401,
      code: 'INVALID_CREDENTIALS',
      fieldErrors: {
        email: ['Email or password is incorrect.'],
      },
    });
  });

  it('throws an ApiError when owner sign-in returns an unexpected body', async () => {
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
      signInOwner({
        email: 'owner@example.com',
        password: 'password123',
      }),
    ).rejects.toMatchObject({
      status: 500,
      message: 'Owner sign-in failed with status 500',
    });
  });
});
