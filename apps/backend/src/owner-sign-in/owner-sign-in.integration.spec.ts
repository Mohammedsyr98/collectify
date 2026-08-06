import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import type { OwnerSignInRequest, OwnerSignUpRequest } from '@collectify/contracts';

import {
  startIntegrationPostgres,
  type IntegrationBackend,
  type IntegrationPostgres,
} from '../test-support/integration-postgres';

describe('POST /owner/sign-in', () => {
  let postgres: IntegrationPostgres | undefined;
  let backend: IntegrationBackend | undefined;

  beforeAll(async () => {
    postgres = await startIntegrationPostgres();
    backend = await postgres.startBackend();
  });

  beforeEach(async () => {
    await postgres!.reset();
  });

  afterAll(async () => {
    await backend?.app.close();
    await postgres?.stop();
  });

  it('creates an authenticated owner session for existing owners', async () => {
    const signUpResponse = await signUpOwner({
      name: 'Owner',
      email: 'owner@example.com',
      password: 'password123',
      preferredLanguage: 'tr',
      defaultCurrency: 'TRY',
    });
    expect(signUpResponse.status).toBe(200);

    const signInResponse = await signInOwner({
      email: '  OWNER@EXAMPLE.COM  ',
      password: 'password123',
    });

    expect(signInResponse.status).toBe(200);
    expect(getSetCookie(signInResponse.headers)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('better-auth.session_token='),
      ]),
    );
    await expect(signInResponse.json()).resolves.toMatchObject({
      authenticated: true,
      user: {
        email: 'owner@example.com',
        name: 'Owner',
      },
      ownerProfile: {
        preferredLanguage: 'tr',
        defaultCurrency: 'TRY',
      },
    });
  });

  it('rejects invalid owner credentials without creating a session', async () => {
    const signUpResponse = await signUpOwner({
      name: 'Owner',
      email: 'owner@example.com',
      password: 'password123',
      preferredLanguage: 'en',
      defaultCurrency: 'USD',
    });
    expect(signUpResponse.status).toBe(200);

    const signInResponse = await signInOwner({
      email: 'owner@example.com',
      password: 'wrong-password',
    });

    expect(signInResponse.status).toBe(401);
    expect(getSetCookie(signInResponse.headers)).toEqual([]);
    await expect(signInResponse.json()).resolves.toEqual({
      code: 'INVALID_CREDENTIALS',
      message: 'Email or password is incorrect.',
      fieldErrors: {
        email: ['Email or password is incorrect.'],
        password: ['Email or password is incorrect.'],
      },
    });
  });

  it('rejects authenticated users without owner profile context', async () => {
    const signUpResponse = await signUpOwner({
      name: 'Owner',
      email: 'owner@example.com',
      password: 'password123',
      preferredLanguage: 'en',
      defaultCurrency: 'USD',
    });
    expect(signUpResponse.status).toBe(200);

    const signUpBody = await signUpResponse.json();
    await postgres!.query('DELETE FROM owner_profiles WHERE user_id = $1', [
      signUpBody.user.id,
    ]);

    const signInResponse = await signInOwner({
      email: 'owner@example.com',
      password: 'password123',
    });

    expect(signInResponse.status).toBe(409);
    expect(getSetCookie(signInResponse.headers)).toEqual([]);
    await expect(signInResponse.json()).resolves.toEqual({
      code: 'OWNER_PROFILE_MISSING',
      message: 'Owner profile setup is incomplete.',
    });
  });

  async function signUpOwner(request: OwnerSignUpRequest): Promise<Response> {
    return fetch(`${backend!.baseUrl}/owner/sign-up`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(request),
    });
  }

  async function signInOwner(request: OwnerSignInRequest): Promise<Response> {
    return fetch(`${backend!.baseUrl}/owner/sign-in`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(request),
    });
  }
});

function getSetCookie(headers: Headers): string[] {
  return (
    headers as Headers & {
      getSetCookie(): string[];
    }
  ).getSetCookie();
}
