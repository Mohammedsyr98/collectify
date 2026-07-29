import { afterEach, describe, expect, it, vi } from 'vitest';

import { getBackendUrl, getSession } from './api';

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
      credentials: 'include',
    });
  });
});
