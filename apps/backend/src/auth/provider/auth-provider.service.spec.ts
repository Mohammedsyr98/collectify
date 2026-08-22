import type { AuthService } from '@thallesp/nestjs-better-auth';
import type { IncomingHttpHeaders } from 'node:http';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { DatabaseService } from '../../database/database.service';
import { user as authUsers } from '../../database/schema';
import { AuthProviderService } from './auth-provider.service';
import type { CollectifyBetterAuth } from './better-auth.factory';

const mocks = vi.hoisted(() => ({
  isAPIError: vi.fn(),
}));

vi.mock('better-auth/api', () => ({
  isAPIError: mocks.isAPIError,
}));

interface EmailPasswordContext {
  headers: Headers;
  returnHeaders: true;
  body: {
    email: string;
    password: string;
    name?: string;
  };
}

interface HeaderOnlyContext {
  headers: Headers;
  returnHeaders: true;
}

describe('AuthProviderService', () => {
  beforeEach(() => {
    mocks.isAPIError.mockReset();
  });

  it('creates an email user through Better Auth and returns a provider-shaped result', async () => {
    const requestHeaders: IncomingHttpHeaders = {
      cookie: 'collectify_device=device_123',
    };
    const responseHeaders = new Headers({
      'cache-control': 'no-store',
    });
    const signUpEmail = vi.fn(async (context: EmailPasswordContext) => {
      expect(context.headers.get('cookie')).toBe('collectify_device=device_123');
      expect(context.returnHeaders).toBe(true);
      expect(context.body).toEqual({
        name: 'Owner',
        email: 'owner@example.test',
        password: 'password123',
      });

      return {
        response: {
          token: 'session-token',
          user: {
            id: 'user_123',
            email: 'owner@example.test',
            name: 'Owner',
          },
        },
        headers: responseHeaders,
      };
    });
    const provider = createProvider({
      signUpEmail,
    });

    await expect(
      provider.createEmailUser({
        name: 'Owner',
        email: 'owner@example.test',
        password: 'password123',
        requestHeaders,
      }),
    ).resolves.toEqual({
      outcome: 'created',
      user: {
        id: 'user_123',
        email: 'owner@example.test',
        name: 'Owner',
      },
      responseHeaders: {
        cacheControl: 'no-store',
        setCookies: [],
      },
    });
  });

  it('maps duplicate email failures to a provider outcome', async () => {
    const duplicateEmailError = {
      body: {
        code: 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL',
      },
    };
    const signUpEmail = vi.fn(async () => {
      throw duplicateEmailError;
    });
    mocks.isAPIError.mockReturnValue(true);
    const provider = createProvider({
      signUpEmail,
    });

    await expect(
      provider.createEmailUser({
        name: 'Owner',
        email: 'owner@example.test',
        password: 'password123',
        requestHeaders: {},
      }),
    ).resolves.toEqual({
      outcome: 'emailAlreadyExists',
    });
    expect(mocks.isAPIError).toHaveBeenCalledWith(duplicateEmailError);
  });

  it('maps other create email user failures to a generic provider outcome', async () => {
    const signUpEmail = vi.fn(async () => {
      throw new Error('auth provider unavailable');
    });
    mocks.isAPIError.mockReturnValue(false);
    const provider = createProvider({
      signUpEmail,
    });

    await expect(
      provider.createEmailUser({
        name: 'Owner',
        email: 'owner@example.test',
        password: 'password123',
        requestHeaders: {},
      }),
    ).resolves.toEqual({
      outcome: 'failed',
    });
  });

  it('maps sign-in failures to invalid credentials', async () => {
    const signInEmail = vi.fn(async () => {
      throw new Error('invalid email or password');
    });
    const provider = createProvider({
      signInEmail,
    });

    await expect(
      provider.signInWithEmail({
        email: 'owner@example.test',
        password: 'wrong-password',
        requestHeaders: {},
      }),
    ).resolves.toEqual({
      outcome: 'invalidCredentials',
    });
  });

  it('reads a missing session as signed out with empty response headers', async () => {
    const getSession = vi.fn(async (context: HeaderOnlyContext) => {
      expect(context.returnHeaders).toBe(true);

      return null;
    });
    const provider = createProvider({
      getSession,
    });

    const result = await provider.readSession({});

    expect(result.session).toBeNull();
    expect(result.responseHeaders).toEqual({
      cacheControl: null,
      setCookies: [],
    });
  });

  it('signs out without exposing the Better Auth response body', async () => {
    const responseHeaders = new Headers();
    responseHeaders.append(
      'set-cookie',
      'better-auth.session_token=; Path=/; Max-Age=0; HttpOnly',
    );
    const signOut = vi.fn(async (context: HeaderOnlyContext) => {
      expect(context.headers.get('cookie')).toBe('better-auth.session_token=old');
      expect(context.returnHeaders).toBe(true);

      return {
        response: {
          success: true,
        },
        headers: responseHeaders,
      };
    });
    const provider = createProvider({
      signOut,
    });

    await expect(
      provider.signOut({
        cookie: 'better-auth.session_token=old',
      }),
    ).resolves.toEqual({
      responseHeaders: {
        cacheControl: null,
        setCookies: [
          'better-auth.session_token=; Path=/; Max-Age=0; HttpOnly',
        ],
      },
    });
  });

  it('hides Better Auth user table deletion behind deleteUser', async () => {
    const where = vi.fn();
    const deleteFrom = vi.fn(() => ({
      where,
    }));
    const provider = createProvider(
      {},
      createDatabaseService({
        delete: deleteFrom,
      }),
    );

    await provider.deleteUser('user_123');

    expect(deleteFrom).toHaveBeenCalledWith(authUsers);
    expect(where).toHaveBeenCalledTimes(1);
  });
});

function createProvider(
  api: object,
  databaseService: DatabaseService = createDatabaseService(),
): AuthProviderService {
  return new AuthProviderService(
    {
      api,
    } as AuthService<CollectifyBetterAuth>,
    databaseService,
  );
}

function createDatabaseService(db: object = {}): DatabaseService {
  return {
    db,
  } as DatabaseService;
}
