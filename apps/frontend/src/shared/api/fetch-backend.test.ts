import { afterEach, describe, expect, it, vi } from 'vitest';

import { fetchBackend } from './fetch-backend';
import { getBackendUrl } from './http';

describe('fetchBackend', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends JSON requests to the backend with credentials included', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => ({
          name: 'Owner',
        }),
      }),
    );

    const response = await fetchBackend({
      path: '/owner/sign-up',
      method: 'POST',
      body: {
        email: 'owner@example.com',
      },
      responseSchema: {
        safeParse: (value: unknown) => ({
          success: true,
          data: {
            normalizedName: (value as { name: string }).name.toLowerCase(),
          },
        }),
      },
      unexpectedMessage: 'Unexpected response.',
    });

    expect(response).toEqual({
      normalizedName: 'owner',
    });
    expect(fetch).toHaveBeenCalledWith(`${getBackendUrl()}/owner/sign-up`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        email: 'owner@example.com',
      }),
    });
  });

  it('omits the JSON body and content-type header for body-less requests', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          authenticated: false,
        }),
      }),
    );

    await fetchBackend({
      path: '/session',
      method: 'GET',
      responseSchema: {
        safeParse: (value: unknown) => ({
          success: true,
          data: value,
        }),
      },
      unexpectedMessage: 'Unexpected response.',
    });

    expect(fetch).toHaveBeenCalledWith(`${getBackendUrl()}/session`, {
      method: 'GET',
      credentials: 'include',
    });
  });

  it('throws an ApiError from backend error response bodies', async () => {
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
      fetchBackend({
        path: '/owner/sign-up',
        method: 'POST',
        body: {
          email: 'owner@example.com',
        },
        responseSchema: {
          safeParse: (value: unknown) => ({
            success: true,
            data: value,
          }),
        },
        unexpectedMessage: 'Unexpected response.',
      }),
    ).rejects.toMatchObject({
      code: 'ACCOUNT_ALREADY_EXISTS',
      fieldErrors: {
        email: ['An account already exists for this email.'],
      },
      message: 'An account already exists for this email.',
      status: 409,
    });
  });

  it('throws a message-less ApiError for malformed failed responses', async () => {
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
      fetchBackend({
        path: '/owner/sign-up',
        method: 'POST',
        responseSchema: {
          safeParse: (value: unknown) => ({
            success: true,
            data: value,
          }),
        },
        unexpectedMessage: 'Unexpected response.',
      }),
    ).rejects.toMatchObject({
      message: '',
      status: 500,
    });
  });

  it('throws the unexpected response message when successful bodies fail schema validation', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          success: false,
        }),
      }),
    );

    await expect(
      fetchBackend({
        path: '/owner/sign-out',
        method: 'POST',
        responseSchema: {
          safeParse: () => ({
            success: false,
          }),
        },
        unexpectedMessage: 'Owner sign-out returned an unexpected response.',
      }),
    ).rejects.toMatchObject({
      message: 'Owner sign-out returned an unexpected response.',
      status: 200,
    });
  });
});
