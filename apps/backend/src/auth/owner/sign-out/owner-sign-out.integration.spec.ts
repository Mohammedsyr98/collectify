import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { getSetCookie } from '../../../test-support/http-cookies';
import {
  startIntegrationPostgres,
  type IntegrationBackend,
  type IntegrationPostgres,
} from '../../../test-support/integration-postgres';
import { createOwnerAuthClient } from '../../../test-support/owner-auth-client';

describe('POST /owner/sign-out', () => {
  let postgres: IntegrationPostgres | undefined;
  let backend: IntegrationBackend | undefined;
  let ownerAuth: ReturnType<typeof createOwnerAuthClient> | undefined;

  beforeAll(async () => {
    postgres = await startIntegrationPostgres();
    backend = await postgres.startBackend();
    ownerAuth = createOwnerAuthClient(backend.baseUrl);
  });

  beforeEach(async () => {
    await postgres!.reset();
  });

  afterAll(async () => {
    await backend?.app.close();
    await postgres?.stop();
  });

  it('clears the active owner session and leaves the next session probe signed out', async () => {
    const signUpResponse = await ownerAuth!.signUpOwner({
      name: 'Owner',
      email: 'owner@example.com',
      password: 'password123',
      preferredLanguage: 'en',
      defaultCurrency: 'USD',
    });
    expect(signUpResponse.status).toBe(200);

    const restoredSessionResponse = await ownerAuth!.getSession(
      signUpResponse.headers,
    );
    expect(restoredSessionResponse.status).toBe(200);
    await expect(restoredSessionResponse.json()).resolves.toMatchObject({
      authenticated: true,
      user: {
        email: 'owner@example.com',
        name: 'Owner',
      },
      ownerProfile: {
        preferredLanguage: 'en',
        defaultCurrency: 'USD',
      },
    });

    const signOutResponse = await ownerAuth!.signOutOwner(signUpResponse.headers);

    expect(signOutResponse.status).toBe(200);
    expect(getSetCookie(signOutResponse.headers)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('better-auth.session_token=;'),
      ]),
    );
    await expect(signOutResponse.json()).resolves.toEqual({ success: true });

    const staleSessionResponse = await ownerAuth!.getSession(
      signUpResponse.headers,
    );

    expect(staleSessionResponse.status).toBe(200);
    await expect(staleSessionResponse.json()).resolves.toEqual({
      authenticated: false,
      user: null,
      ownerProfile: null,
    });
  });
});
