import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { getSetCookie } from '../test-support/http-cookies';
import {
  startIntegrationPostgres,
  type IntegrationBackend,
  type IntegrationPostgres,
} from '../test-support/integration-postgres';
import { createOwnerAuthClient } from '../test-support/owner-auth-client';

describe('POST /owner/sign-up', () => {
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

  it('creates an authenticated owner session', async () => {
    const response = await ownerAuth!.signUpOwner({
      name: 'Owner',
      email: 'owner@example.com',
      password: 'password123',
      preferredLanguage: 'en',
      defaultCurrency: 'USD',
    });

    expect(response.status).toBe(200);
    expect(getSetCookie(response.headers)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('better-auth.session_token='),
      ]),
    );
    await expect(response.json()).resolves.toMatchObject({
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

    const sessionResponse = await ownerAuth!.getSession(response.headers);

    expect(sessionResponse.status).toBe(200);
    await expect(sessionResponse.json()).resolves.toMatchObject({
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
  });

  it('normalizes owner signup input before creating the session', async () => {
    const response = await ownerAuth!.signUpOwner({
      name: '  Owner  ',
      email: '  OWNER@EXAMPLE.COM  ',
      password: 'password123',
      preferredLanguage: 'tr',
      defaultCurrency: 'TRY',
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
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

  it('rejects invalid owner setup input', async () => {
    const response = await fetch(`${backend!.baseUrl}/owner/sign-up`, {
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
    expect(getSetCookie(response.headers)).toEqual([]);
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
  });

  it('rejects duplicate owner email', async () => {
    const firstResponse = await ownerAuth!.signUpOwner({
      name: 'Owner',
      email: 'owner@example.com',
      password: 'password123',
      preferredLanguage: 'en',
      defaultCurrency: 'USD',
    });

    expect(firstResponse.status).toBe(200);

    const duplicateResponse = await ownerAuth!.signUpOwner({
      name: 'Second Owner',
      email: '  OWNER@EXAMPLE.COM  ',
      password: 'password123',
      preferredLanguage: 'tr',
      defaultCurrency: 'TRY',
    });

    expect(duplicateResponse.status).toBe(409);
    expect(getSetCookie(duplicateResponse.headers)).toEqual([]);
    await expect(duplicateResponse.json()).resolves.toEqual({
      code: 'ACCOUNT_ALREADY_EXISTS',
      message: 'An account already exists for this email.',
      fieldErrors: {
        email: ['An account already exists for this email.'],
      },
    });
  });

  it('does not leave the email claimed when owner profile setup fails', async () => {
    await enableOwnerProfileInsertFailure();

    try {
      const failedResponse = await ownerAuth!.signUpOwner({
        name: 'Rollback Owner',
        email: 'rollback-owner@example.com',
        password: 'password123',
        preferredLanguage: 'en',
        defaultCurrency: 'USD',
      });

      expect(failedResponse.status).toBe(500);
      expect(getSetCookie(failedResponse.headers)).toEqual([]);
      await expect(failedResponse.json()).resolves.toEqual({
        code: 'PROFILE_SETUP_FAILED',
        message: 'We could not finish owner setup. Try again.',
      });
    } finally {
      await disableOwnerProfileInsertFailure();
    }

    const retryResponse = await ownerAuth!.signUpOwner({
      name: 'Rollback Owner',
      email: 'rollback-owner@example.com',
      password: 'password123',
      preferredLanguage: 'en',
      defaultCurrency: 'USD',
    });

    expect(retryResponse.status).toBe(200);
    await expect(retryResponse.json()).resolves.toMatchObject({
      authenticated: true,
      user: {
        email: 'rollback-owner@example.com',
        name: 'Rollback Owner',
      },
      ownerProfile: {
        preferredLanguage: 'en',
        defaultCurrency: 'USD',
      },
    });
  });

  async function enableOwnerProfileInsertFailure(): Promise<void> {
    await postgres!.query(`
      CREATE OR REPLACE FUNCTION fail_owner_profile_insert()
      RETURNS trigger
      LANGUAGE plpgsql
      AS $$
      BEGIN
        RAISE EXCEPTION 'owner profile insert failed for integration test';
      END;
      $$
    `);
    await postgres!.query(`
      CREATE TRIGGER fail_owner_profile_insert
      BEFORE INSERT ON "owner_profiles"
      FOR EACH ROW
      EXECUTE FUNCTION fail_owner_profile_insert()
    `);
  }

  async function disableOwnerProfileInsertFailure(): Promise<void> {
    await postgres!.query(
      'DROP TRIGGER IF EXISTS fail_owner_profile_insert ON "owner_profiles"',
    );
    await postgres!.query('DROP FUNCTION IF EXISTS fail_owner_profile_insert()');
  }
});
