import { afterEach, describe, expect, it, vi } from 'vitest';

import { getBackendUrl } from '../../../shared/api/http';
import { signOutOwner } from './sign-out-owner';

describe('owner sign-out API', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('posts owner sign-out with cookies included', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
        }),
      }),
    );

    await expect(signOutOwner()).resolves.toEqual({
      success: true,
    });

    expect(fetch).toHaveBeenCalledWith(`${getBackendUrl()}/owner/sign-out`, {
      method: 'POST',
      credentials: 'include',
    });
  });

  it('throws an ApiError when owner sign-out returns an unexpected body', async () => {
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

    await expect(signOutOwner()).rejects.toMatchObject({
      status: 200,
      message: 'Owner sign-out returned an unexpected response.',
    });
  });
});
