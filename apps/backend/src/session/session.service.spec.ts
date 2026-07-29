import { describe, expect, it } from 'vitest';

import { SessionService } from './session.service';

describe('SessionService', () => {
  it('maps an authenticated auth session and preserves response headers', async () => {
    const responseHeaders = new Headers({
      'cache-control': 'no-store',
    });
    const service = new SessionService({
      getSession: async () => ({
        session: {
          user: {
            id: 'user_123',
            email: 'owner@example.test',
          },
        },
        responseHeaders,
      }),
    });

    await expect(service.getCurrentSession({})).resolves.toEqual({
      body: {
        authenticated: true,
        user: {
          id: 'user_123',
          email: 'owner@example.test',
          name: null,
        },
        ownerProfile: null,
      },
      responseHeaders,
    });
  });
});
