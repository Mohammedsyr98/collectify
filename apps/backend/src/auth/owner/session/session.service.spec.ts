import type { IncomingHttpHeaders } from 'node:http';
import { describe, expect, it, vi } from 'vitest';

import type { OwnerContextService } from '../context/owner-context.service';
import type { AuthProviderService } from '../../provider/auth-provider.service';
import type { AuthProviderReadSessionResult } from '../../provider/auth-provider.types';
import { SessionService } from './session.service';

describe('SessionService', () => {
  it('maps an authenticated auth session with owner profile and preserves response headers', async () => {
    const nodeHeaders: IncomingHttpHeaders = {
      cookie: 'better-auth.session_token=valid',
    };
    const responseHeaders = {
      cacheControl: 'no-store',
      setCookies: [],
    };
    const authSession = {
      user: {
        id: 'user_123',
        email: 'owner@example.test',
        name: null,
      },
    };
    const readSession = vi.fn(
      async (): Promise<AuthProviderReadSessionResult> => ({
        session: authSession,
        responseHeaders,
      }),
    );
    const findOwnerProfileForUser = vi.fn(async () => ({
      id: 'profile_123',
      userId: 'user_123',
      preferredLanguage: 'tr' as const,
      defaultCurrency: 'TRY' as const,
    }));
    const service = new SessionService(
      createAuthProvider(readSession),
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
    expect(readSession).toHaveBeenCalledWith(nodeHeaders);
    expect(findOwnerProfileForUser).toHaveBeenCalledWith('user_123');
  });

  it('returns a signed-out session when Better Auth returns no result', async () => {
    const findOwnerProfileForUser = vi.fn();
    const responseHeaders = {
      cacheControl: null,
      setCookies: [],
    };
    const service = new SessionService(
      createAuthProvider(async () => ({
        session: null,
        responseHeaders,
      })),
      createOwnerContextService(findOwnerProfileForUser),
    );

    await expect(service.getCurrentSession({})).resolves.toEqual({
      body: {
        authenticated: false,
        user: null,
        ownerProfile: null,
      },
      responseHeaders,
    });
    expect(findOwnerProfileForUser).not.toHaveBeenCalled();
  });
});

function createAuthProvider(
  readSession: (
    headers: IncomingHttpHeaders,
  ) => Promise<AuthProviderReadSessionResult>,
): AuthProviderService {
  return {
    readSession,
  } as unknown as AuthProviderService;
}

function createOwnerContextService(
  findOwnerProfileForUser: (userId: string) => Promise<unknown>,
): OwnerContextService {
  return {
    findOwnerProfileForUser,
  } as unknown as OwnerContextService;
}
