import {
  createCustomerResponseSchema,
  customerDetailsResponseSchema,
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

  async function signUpOwner(email: string): Promise<{ cookieHeader: string }> {
    const response = await ownerAuth!.signUpOwner({
      name: 'Owner',
      email,
      password: 'password123',
      preferredLanguage: 'en',
      defaultCurrency: 'USD',
    });

    expect(response.status).toBe(200);

    return {
      cookieHeader: toCookieHeader(getSetCookie(response.headers)),
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
});
