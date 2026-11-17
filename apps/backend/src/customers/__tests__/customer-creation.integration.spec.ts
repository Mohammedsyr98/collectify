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
} from '@collectify/contracts';

describe('customer creation routes', () => {
  let context: CustomerTestContext | undefined;
  let backend: CustomerTestContext['backend'] | undefined;

  const { signUpOwner, createCustomer } = createCustomerTestHelpers(
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

  it('creates and persists normalized customer details for the authenticated owner', async () => {
    const owner = await signUpOwner('owner@example.com');

    const createResponse = await createCustomer(owner.cookieHeader, {
      name: '  Acme Market  ',
      code: '  ACME-001  ',
      phoneNumber: '  +90 555 123 45 67  ',
    });

    expect(createResponse.status).toBe(201);
    const createdBody = await createResponse.json();
    const created = createCustomerResponseSchema.parse(createdBody);
    expect(created).toMatchObject({
      name: 'Acme Market',
      code: 'ACME-001',
      phoneNumber: '+90 555 123 45 67',
      address: null,
      financialSummary: [],
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

  it('allows the same customer code across owners but rejects it within one owner', async () => {
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
        code: 'ACME',
        phoneNumber: '+90 555 222 22 22',
      }),
    ).toHaveProperty('status', 201);

    const duplicateResponse = await createCustomer(firstOwner.cookieHeader, {
      name: 'Duplicate Acme',
      code: 'ACME',
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
});
