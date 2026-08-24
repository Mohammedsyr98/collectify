import { afterEach, describe, expect, it, vi } from 'vitest';

import { getBackendUrl } from '../../../shared/api/http';
import { getSession } from './get-session';

describe('session API', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('requests the current session with credentials included', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          authenticated: false,
          user: null,
          ownerProfile: null,
        }),
      }),
    );

    await expect(getSession()).resolves.toEqual({
      authenticated: false,
      user: null,
      ownerProfile: null,
    });

    expect(fetch).toHaveBeenCalledWith(`${getBackendUrl()}/session`, {
      method: 'GET',
      credentials: 'include',
    });
  });

  it('throws an ApiError when the session probe returns an unexpected body', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          authenticated: true,
          user: null,
          ownerProfile: null,
        }),
      }),
    );

    await expect(getSession()).rejects.toMatchObject({
      status: 200,
      message: 'Session probe returned an unexpected response.',
    });
  });
});
