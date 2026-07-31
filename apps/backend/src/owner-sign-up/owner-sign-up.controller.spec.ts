import type { INestApplication } from '@nestjs/common';
import { AuthService } from '@thallesp/nestjs-better-auth';
import { Test } from '@nestjs/testing';
import { APIError } from 'better-auth/api';
import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { CollectifyBetterAuth } from '../auth/better-auth';
import { DatabaseService } from '../database/database.service';
import { OwnerSignUpController } from './owner-sign-up.controller';
import { OwnerSignUpService } from './owner-sign-up.service';

interface SignUpEmailContext {
  headers: Headers;
  returnHeaders: true;
  body: {
    name: string;
    email: string;
    password: string;
  };
}

interface SignUpEmailResult {
  response: {
    token: string | null;
    user: {
      id: string;
      email: string;
      name?: string | null;
    };
  };
  headers: Headers;
}

describe('OwnerSignUpController', () => {
  let app: INestApplication | null = null;

  afterEach(async () => {
    await app?.close();
    app = null;
  });

  it('creates an auth session and owner profile for valid owner setup', async () => {
    const authResponseHeaders = new Headers({
      'cache-control': 'no-store',
    });
    authResponseHeaders.append(
      'set-cookie',
      'better-auth.session_token=valid; Path=/; HttpOnly',
    );
    authResponseHeaders.append(
      'set-cookie',
      'better-auth.session_data=valid; Path=/; HttpOnly',
    );
    const signUpEmail = vi.fn(
      async (context: SignUpEmailContext): Promise<SignUpEmailResult> => {
        expect(context.returnHeaders).toBe(true);

        return {
          response: {
            token: 'session-token',
            user: {
              id: 'user_123',
              email: context.body.email,
              name: context.body.name,
            },
          },
          headers: authResponseHeaders,
        };
      },
    );
    const database = createDatabaseService();
    app = await createApp(createAuthService(signUpEmail), database.service);

    const response = await fetch(await apiUrl(app, '/owner/sign-up'), {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        name: '  Owner  ',
        email: '  OWNER@EXAMPLE.COM  ',
        password: 'password123',
        preferredLanguage: 'tr',
        defaultCurrency: 'TRY',
      }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(getSetCookie(response.headers)).toEqual([
      'better-auth.session_token=valid; Path=/; HttpOnly',
      'better-auth.session_data=valid; Path=/; HttpOnly',
    ]);
    await expect(response.json()).resolves.toEqual({
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
    });
    expect(signUpEmail).toHaveBeenCalledWith({
      headers: expect.any(Headers) as Headers,
      returnHeaders: true,
      body: {
        name: 'Owner',
        email: 'owner@example.com',
        password: 'password123',
      },
    });
    expect(database.insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user_123',
        preferredLanguage: 'tr',
        defaultCurrency: 'TRY',
      }),
    );
  });

  it('returns controlled validation errors for invalid owner setup', async () => {
    const signUpEmail = vi.fn();
    app = await createApp(createAuthService(signUpEmail), createDatabaseService().service);

    const response = await fetch(await apiUrl(app, '/owner/sign-up'), {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        name: '',
        email: 'not-an-email',
        password: 'short',
        preferredLanguage: 'fr',
        defaultCurrency: 'GBP',
      }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      code: 'VALIDATION_ERROR',
      message: 'Check the highlighted fields.',
      fieldErrors: {
        name: ['Name is required.'],
        email: ['Enter a valid email address.'],
        password: ['Password must be between 8 and 128 characters.'],
        preferredLanguage: ['Choose English or Turkish.'],
        defaultCurrency: ['Choose TRY, USD, or EUR.'],
      },
    });
    expect(signUpEmail).not.toHaveBeenCalled();
  });

  it('returns a controlled duplicate-account error', async () => {
    app = await createApp(
      createAuthService(async () => {
        throw APIError.from(
          'UNPROCESSABLE_ENTITY',
          {
            code: 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL',
            message: 'User already exists. Use another email.',
          },
        );
      }),
      createDatabaseService().service,
    );

    const response = await fetch(await apiUrl(app, '/owner/sign-up'), {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(validOwnerSignUpRequest()),
    });

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      code: 'ACCOUNT_ALREADY_EXISTS',
      message: 'An account already exists for this email.',
      fieldErrors: {
        email: ['An account already exists for this email.'],
      },
    });
  });

  it('returns a controlled setup error when auth sign-up fails', async () => {
    const signUpEmail = vi.fn(async () => {
      throw new Error('auth unavailable');
    });
    const database = createDatabaseService();
    app = await createApp(createAuthService(signUpEmail), database.service);

    const response = await fetch(await apiUrl(app, '/owner/sign-up'), {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(validOwnerSignUpRequest()),
    });

    expect(response.status).toBe(500);
    expect(getSetCookie(response.headers)).toEqual([]);
    await expect(response.json()).resolves.toEqual({
      code: 'PROFILE_SETUP_FAILED',
      message: 'We could not finish owner setup. Try again.',
    });
    expect(signUpEmail).toHaveBeenCalledOnce();
    expect(database.insertValues).not.toHaveBeenCalled();
    expect(database.deleteWhere).not.toHaveBeenCalled();
  });

  it('rolls back the auth user and sends no sign-up cookies when profile setup fails', async () => {
    const authResponseHeaders = new Headers();
    authResponseHeaders.append(
      'set-cookie',
      'better-auth.session_token=valid; Path=/; HttpOnly',
    );
    const database = createDatabaseService({
      insertError: new Error('insert failed'),
    });
    app = await createApp(
      createAuthService(async () => ({
        response: {
          token: 'session-token',
          user: {
            id: 'user_rollback',
            email: 'owner@example.com',
            name: 'Owner',
          },
        },
        headers: authResponseHeaders,
      })),
      database.service,
    );

    const response = await fetch(await apiUrl(app, '/owner/sign-up'), {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(validOwnerSignUpRequest()),
    });

    expect(response.status).toBe(500);
    expect(getSetCookie(response.headers)).toEqual([]);
    await expect(response.json()).resolves.toEqual({
      code: 'PROFILE_SETUP_FAILED',
      message: 'We could not finish owner setup. Try again.',
    });
    expect(database.deleteWhere).toHaveBeenCalled();
  });

  it('returns a controlled setup error when rollback also fails', async () => {
    const authResponseHeaders = new Headers();
    authResponseHeaders.append(
      'set-cookie',
      'better-auth.session_token=valid; Path=/; HttpOnly',
    );
    const database = createDatabaseService({
      insertError: new Error('insert failed'),
      deleteError: new Error('delete failed'),
    });
    app = await createApp(
      createAuthService(async () => ({
        response: {
          token: 'session-token',
          user: {
            id: 'user_rollback',
            email: 'owner@example.com',
            name: 'Owner',
          },
        },
        headers: authResponseHeaders,
      })),
      database.service,
    );

    const response = await fetch(await apiUrl(app, '/owner/sign-up'), {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(validOwnerSignUpRequest()),
    });

    expect(response.status).toBe(500);
    expect(getSetCookie(response.headers)).toEqual([]);
    await expect(response.json()).resolves.toEqual({
      code: 'PROFILE_SETUP_FAILED',
      message: 'We could not finish owner setup. Try again.',
    });
    expect(database.deleteWhere).toHaveBeenCalled();
  });
});

async function createApp(
  authService: AuthService<CollectifyBetterAuth>,
  databaseService: DatabaseService,
): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    controllers: [OwnerSignUpController],
    providers: [
      OwnerSignUpService,
      {
        provide: AuthService,
        useValue: authService,
      },
      {
        provide: DatabaseService,
        useValue: databaseService,
      },
    ],
  }).compile();
  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix('api');
  await app.listen(0);

  return app;
}

async function apiUrl(app: INestApplication, path: string): Promise<string> {
  const address = app.getHttpServer().address() as AddressInfo;

  return `http://127.0.0.1:${address.port}/api${path}`;
}

function createAuthService(
  signUpEmail: (
    context: SignUpEmailContext,
  ) => Promise<SignUpEmailResult>,
): AuthService<CollectifyBetterAuth> {
  return {
    api: {
      signUpEmail,
    },
  } as unknown as AuthService<CollectifyBetterAuth>;
}

function createDatabaseService(
  options: { insertError?: Error; deleteError?: Error } = {},
) {
  const insertValues = vi.fn(async () => {
    if (options.insertError) {
      throw options.insertError;
    }
  });
  const insert = vi.fn(() => ({
    values: insertValues,
  }));
  const deleteWhere = vi.fn(async () => {
    if (options.deleteError) {
      throw options.deleteError;
    }
  });
  const deleteRow = vi.fn(() => ({
    where: deleteWhere,
  }));

  return {
    service: {
      db: {
        insert,
        delete: deleteRow,
      },
    } as unknown as DatabaseService,
    insertValues,
    deleteWhere,
  };
}

function getSetCookie(headers: Headers): string[] {
  return (
    headers as Headers & {
      getSetCookie(): string[];
    }
  ).getSetCookie();
}

function validOwnerSignUpRequest() {
  return {
    name: 'Owner',
    email: 'owner@example.com',
    password: 'password123',
    preferredLanguage: 'en',
    defaultCurrency: 'USD',
  };
}
