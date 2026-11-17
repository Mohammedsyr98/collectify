import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import {
  createIntegrationDatabase,
  startIntegrationBackend,
} from '../../test-support/integration-test-support';
import { createOwnerAuthClient } from '../../test-support/owner-auth-client';
import {
  createCustomerTestHelpers,
  type CustomerTestContext,
} from './customer-integration-test-support';


import {
  createCustomerResponseSchema,
  customerDetailsResponseSchema,
  customerListResponseSchema,
} from '@collectify/contracts';

describe('customer access control', () => {
  let context: CustomerTestContext | undefined;
  let backend: CustomerTestContext['backend'] | undefined;

  const { signUpOwner, createCustomer, updateCustomer, insertCustomer } = createCustomerTestHelpers(
    () => context!,
  );

  beforeAll(async () => {
    const database = createIntegrationDatabase();
    backend = await startIntegrationBackend();
    context = {
      database,
      backend,
      ownerAuth: createOwnerAuthClient(backend.baseUrl),
    };
  });

  beforeEach(async () => {
    await context!.database.reset();
  });

  afterAll(async () => {
    await backend?.app.close();
  });

  it('returns the same not-found response when updating missing and non-owned customers', async () => {
    const firstOwner = await signUpOwner('first-owner@example.com');
    const secondOwner = await signUpOwner('second-owner@example.com');
    const createResponse = await createCustomer(firstOwner.cookieHeader, {
      name: 'Acme Market',
      code: 'ACME',
      phoneNumber: '+90 555 111 11 11',
    });
    const created = createCustomerResponseSchema.parse(await createResponse.json());

    const missingResponse = await updateCustomer(
      firstOwner.cookieHeader,
      'missing',
      {
        name: 'Missing Customer',
      },
    );
    const nonOwnedResponse = await updateCustomer(
      secondOwner.cookieHeader,
      created.id,
      {
        name: 'Stolen Customer',
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

  it("does not modify another owner's customer when rejecting an update", async () => {
    const firstOwner = await signUpOwner('protected-customer-owner@example.com');
    const secondOwner = await signUpOwner('unauthorized-customer-owner@example.com');
    const customerId = 'customer_protected_from_update';

    await insertCustomer({
      ownerProfileId: firstOwner.ownerProfileId,
      id: customerId,
      name: 'Protected Customer',
      code: 'PROTECTED',
      phoneNumber: '+90 555 100 00 03',
      createdAt: '2026-08-29 13:00:00',
    });

    const updateResponse = await updateCustomer(
      secondOwner.cookieHeader,
      customerId,
      {
        name: 'Stolen Customer',
      },
    );

    expect(updateResponse.status).toBe(404);

    const ownerReadResponse = await fetch(
      `${backend!.baseUrl}/customers/${customerId}`,
      {
        headers: {
          cookie: firstOwner.cookieHeader,
        },
      },
    );

    expect(ownerReadResponse.status).toBe(200);
    const customer = customerDetailsResponseSchema.parse(
      await ownerReadResponse.json(),
    );
    expect(customer.name).toBe('Protected Customer');
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
});
