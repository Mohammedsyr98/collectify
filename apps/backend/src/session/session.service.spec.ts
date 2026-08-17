import type { AuthService } from '@thallesp/nestjs-better-auth';
import type { IncomingHttpHeaders } from 'node:http';
import { describe, expect, it, vi } from 'vitest';

import type { CollectifyBetterAuth } from '../auth/better-auth/better-auth.factory';
import type { OwnerContextService } from '../auth/owner-context/owner-context.service';
import { SessionService } from './session.service';

interface AuthSessionResult {
  user: {
    id: string;
    email: string;
    name?: string | null;
  };
}

interface GetSessionContext {
  headers: Headers;
  returnHeaders: true;
}

interface GetSessionResult {
  response: AuthSessionResult | null;
  headers: Headers;
}

describe('SessionService', () => {
  it('maps an authenticated auth session with owner profile and preserves response headers', async () => {
    const nodeHeaders: IncomingHttpHeaders = {
      cookie: 'better-auth.session_token=valid',
    };
    const responseHeaders = new Headers({
      'cache-control': 'no-store',
    });
    const authSession = {
      user: {
        id: 'user_123',
        email: 'owner@example.test',
      },
    };
    const getSession = vi.fn(
      async (context: GetSessionContext): Promise<GetSessionResult> => {
        expect(context.returnHeaders).toBe(true);

        return {
          response: authSession,
          headers: responseHeaders,
        };
      },
    );
    const findOwnerProfileForUser = vi.fn(async () => ({
      id: 'profile_123',
      userId: 'user_123',
      preferredLanguage: 'tr' as const,
      defaultCurrency: 'TRY' as const,
    }));
    const service = new SessionService(
      createAuthService(getSession),
      createOwnerContextService(findOwnerProfileForUser),
    );

    await expect(service.getCurrentSession(nodeHeaders)).resolves.toEqual({
      body: {
        authenticated: true,
        user: {
          id: 'user_123',
          email: 'owner@example.test',
          name: null,
        },
        ownerProfile: {
          preferredLanguage: 'tr',
          defaultCurrency: 'TRY',
        },
      },
      responseHeaders,
    });
    expect(getSession).toHaveBeenCalledWith({
      headers: expect.any(Headers) as Headers,
      returnHeaders: true,
    });
    const context = getSession.mock.calls[0]?.[0];
    expect(context?.headers.get('cookie')).toBe(
      'better-auth.session_token=valid',
    );
    expect(findOwnerProfileForUser).toHaveBeenCalledWith('user_123');
  });

  it('returns a signed-out session when Better Auth returns no result', async () => {
    const findOwnerProfileForUser = vi.fn();
    const service = new SessionService(
      createAuthService(async () => null),
      createOwnerContextService(findOwnerProfileForUser),
    );

    await expect(service.getCurrentSession({})).resolves.toEqual({
      body: {
        authenticated: false,
        user: null,
        ownerProfile: null,
      },
      responseHeaders: new Headers(),
    });
    expect(findOwnerProfileForUser).not.toHaveBeenCalled();
  });
});

function createAuthService(
  getSession: (context: GetSessionContext) => Promise<GetSessionResult | null>,
): AuthService<CollectifyBetterAuth> {
  return {
    api: {
      getSession,
    },
  } as unknown as AuthService<CollectifyBetterAuth>;
}

function createOwnerContextService(
  findOwnerProfileForUser: (userId: string) => Promise<unknown>,
): OwnerContextService {
  return {
    findOwnerProfileForUser,
  } as unknown as OwnerContextService;
}
