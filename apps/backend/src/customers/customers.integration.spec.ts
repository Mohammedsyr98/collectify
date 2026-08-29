import {
  createCustomerResponseSchema,
  customerDetailsResponseSchema,
  customerListResponseSchema,
} from '@collectify/contracts';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { getSetCookie, toCookieHeader } from '../test-support/http-cookies';
import {
  startIntegrationPostgres,
  type IntegrationBackend,
  type IntegrationPostgres,
} from '../test-support/integration-postgres';
import { createOwnerAuthClient } from '../test-support/owner-auth-client';

describe('customer routes', () => {
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

  it('creates a customer for the authenticated owner and retrieves durable details', async () => {
    const owner = await signUpOwner('owner@example.com');

    const createResponse = await createCustomer(owner.cookieHeader, {
      name: '  Acme Market  ',
      code: '  ACME-001  ',
      phoneNumber: '  +90 555 123 45 67  ',
    });

    expect(createResponse.status).toBe(201);
    const created = createCustomerResponseSchema.parse(await createResponse.json());
    expect(created).toMatchObject({
      name: 'Acme Market',
      code: 'ACME-001',
      phoneNumber: '+90 555 123 45 67',
      address: null,
      financialSummary: {
        totalDebtAmount: '0.00',
        totalPaidAmount: '0.00',
        balanceAmount: '0.00',
      },
    });

    const detailsResponse = await fetch(
      `${backend!.baseUrl}/customers/${created.id}`,
      {
        headers: {
          cookie: owner.cookieHeader,
        },
      },
    );

    expect(detailsResponse.status).toBe(200);
    expect(customerDetailsResponseSchema.parse(await detailsResponse.json())).toEqual(
      created,
    );
  });

  it('rejects invalid customer create input with field errors', async () => {
    const owner = await signUpOwner('owner@example.com');

    const response = await createCustomer(owner.cookieHeader, {
      name: '   ',
      code: '',
      phoneNumber: '  ',
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      code: 'VALIDATION_ERROR',
      message: 'Check the highlighted fields.',
      fieldErrors: {
        name: ['Customer name is required.'],
        code: ['Customer code is required.'],
        phoneNumber: ['Phone number is required.'],
      },
    });
  });

  it('rejects duplicate customer code only within the same owner', async () => {
    const firstOwner = await signUpOwner('first-owner@example.com');
    const secondOwner = await signUpOwner('second-owner@example.com');

    expect(
      await createCustomer(firstOwner.cookieHeader, {
        name: 'Acme Market',
        code: 'ACME',
        phoneNumber: '+90 555 111 11 11',
      }),
    ).toHaveProperty('status', 201);
    expect(
      await createCustomer(secondOwner.cookieHeader, {
        name: 'Other Acme',
        code: 'acme',
        phoneNumber: '+90 555 222 22 22',
      }),
    ).toHaveProperty('status', 201);

    const duplicateResponse = await createCustomer(firstOwner.cookieHeader, {
      name: 'Duplicate Acme',
      code: ' acme ',
      phoneNumber: '+90 555 333 33 33',
    });

    expect(duplicateResponse.status).toBe(409);
    await expect(duplicateResponse.json()).resolves.toEqual({
      code: 'CUSTOMER_CODE_ALREADY_EXISTS',
      message: 'A customer with this code already exists.',
      fieldErrors: {
        code: ['A customer with this code already exists.'],
      },
    });
  });

  it('preserves separators while rejecting trimmed case-insensitive duplicate customer codes', async () => {
    const owner = await signUpOwner('separator-owner@example.com');

    for (const [name, code] of [
      ['Customer Space', 'C 104'],
      ['Customer Dash', 'C-104'],
      ['Customer Plain', 'C104'],
    ] as const) {
      expect(
        await createCustomer(owner.cookieHeader, {
          name,
          code,
          phoneNumber: '+90 555 444 44 44',
        }),
      ).toHaveProperty('status', 201);
    }

    const duplicateResponse = await createCustomer(owner.cookieHeader, {
      name: 'Customer Duplicate',
      code: ' c 104 ',
      phoneNumber: '+90 555 555 55 55',
    });

    expect(duplicateResponse.status).toBe(409);
    await expect(duplicateResponse.json()).resolves.toEqual({
      code: 'CUSTOMER_CODE_ALREADY_EXISTS',
      message: 'A customer with this code already exists.',
      fieldErrors: {
        code: ['A customer with this code already exists.'],
      },
    });
  });

  it('returns the same not-found response for missing and non-owned customers', async () => {
    const firstOwner = await signUpOwner('first-owner@example.com');
    const secondOwner = await signUpOwner('second-owner@example.com');
    const createResponse = await createCustomer(firstOwner.cookieHeader, {
      name: 'Acme Market',
      code: 'ACME',
      phoneNumber: '+90 555 111 11 11',
    });
    const created = createCustomerResponseSchema.parse(await createResponse.json());

    const missingResponse = await fetch(`${backend!.baseUrl}/customers/missing`, {
      headers: {
        cookie: firstOwner.cookieHeader,
      },
    });
    const nonOwnedResponse = await fetch(
      `${backend!.baseUrl}/customers/${created.id}`,
      {
        headers: {
          cookie: secondOwner.cookieHeader,
        },
      },
    );

    expect(missingResponse.status).toBe(404);
    expect(nonOwnedResponse.status).toBe(404);
    await expect(missingResponse.json()).resolves.toEqual({
      code: 'CUSTOMER_NOT_FOUND',
      message: 'Customer was not found.',
    });
    await expect(nonOwnedResponse.json()).resolves.toEqual({
      code: 'CUSTOMER_NOT_FOUND',
      message: 'Customer was not found.',
    });
  });

  it('lists only customers that belong to the authenticated owner', async () => {
    const firstOwner = await signUpOwner('first-owner@example.com');
    const secondOwner = await signUpOwner('second-owner@example.com');

    await insertCustomer({
      ownerProfileId: firstOwner.ownerProfileId,
      id: 'customer_first_owner',
      name: 'First Owner Customer',
      code: 'FIRST',
      phoneNumber: '+90 555 100 00 01',
      createdAt: '2026-08-29 11:00:00',
    });
    await insertCustomer({
      ownerProfileId: secondOwner.ownerProfileId,
      id: 'customer_second_owner',
      name: 'Second Owner Customer',
      code: 'SECOND',
      phoneNumber: '+90 555 100 00 02',
      createdAt: '2026-08-29 12:00:00',
    });

    const response = await fetch(`${backend!.baseUrl}/customers`, {
      headers: {
        cookie: firstOwner.cookieHeader,
      },
    });

    expect(response.status).toBe(200);
    const list = customerListResponseSchema.parse(await response.json());

    expect(list.items.map((customer) => customer.id)).toEqual([
      'customer_first_owner',
    ]);
  });

  it('lists newest customers with identifier descending as the deterministic tie-breaker for matching creation times', async () => {
    const owner = await signUpOwner('owner@example.com');

    await insertCustomer({
      ownerProfileId: owner.ownerProfileId,
      id: 'customer_older',
      name: 'Older Customer',
      code: 'OLDER',
      phoneNumber: '+90 555 100 00 00',
      createdAt: '2026-08-29 11:00:00',
    });
    await insertCustomer({
      ownerProfileId: owner.ownerProfileId,
      id: 'customer_tie_a',
      name: 'Tie A Customer',
      code: 'TIE-A',
      phoneNumber: '+90 555 100 00 01',
      createdAt: '2026-08-29 12:00:00',
    });
    await insertCustomer({
      ownerProfileId: owner.ownerProfileId,
      id: 'customer_tie_b',
      name: 'Tie B Customer',
      code: 'TIE-B',
      phoneNumber: '+90 555 100 00 02',
      createdAt: '2026-08-29 12:00:00',
    });

    const response = await fetch(`${backend!.baseUrl}/customers`, {
      headers: {
        cookie: owner.cookieHeader,
      },
    });

    expect(response.status).toBe(200);
    const list = customerListResponseSchema.parse(await response.json());

    expect(list.items.map((customer) => customer.id)).toEqual([
      'customer_tie_b',
      'customer_tie_a',
      'customer_older',
    ]);
  });

  async function signUpOwner(
    email: string,
  ): Promise<{ cookieHeader: string; ownerProfileId: string }> {
    const response = await ownerAuth!.signUpOwner({
      name: 'Owner',
      email,
      password: 'password123',
      preferredLanguage: 'en',
      defaultCurrency: 'USD',
    });

    expect(response.status).toBe(200);

    const [ownerProfile] = await postgres!.query<{ id: string }>(
      `
        SELECT "owner_profiles"."id"
        FROM "owner_profiles"
        JOIN "user" ON "user"."id" = "owner_profiles"."user_id"
        WHERE "user"."email" = $1
      `,
      [email],
    );

    expect(ownerProfile).toBeDefined();

    return {
      cookieHeader: toCookieHeader(getSetCookie(response.headers)),
      ownerProfileId: ownerProfile!.id,
    };
  }

  function createCustomer(
    cookieHeader: string,
    body: unknown,
  ): Promise<Response> {
    return fetch(`${backend!.baseUrl}/customers`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: cookieHeader,
      },
      body: JSON.stringify(body),
    });
  }

  function insertCustomer({
    code,
    createdAt,
    id,
    name,
    ownerProfileId,
    phoneNumber,
  }: {
    code: string;
    createdAt: string;
    id: string;
    name: string;
    ownerProfileId: string;
    phoneNumber: string;
  }): Promise<unknown[]> {
    return postgres!.query(
      `
        INSERT INTO "customers" (
          "id",
          "owner_profile_id",
          "name",
          "code",
          "phone_number",
          "created_at",
          "updated_at"
        )
        VALUES ($1, $2, $3, $4, $5, $6::timestamp, $6::timestamp)
      `,
      [id, ownerProfileId, name, code, phoneNumber, createdAt],
    );
  }
});
