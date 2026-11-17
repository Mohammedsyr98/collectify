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
  customerListPageSize,
  customerListResponseSchema,
} from '@collectify/contracts';

describe('customer listing routes', () => {
  const customerCountWithSecondPage = customerListPageSize + 1;
  const expectedCustomerListTotalPages = 2;
  let context: CustomerTestContext | undefined;
  let backend: CustomerTestContext['backend'] | undefined;

  const { signUpOwner, createCustomer, insertCustomer } = createCustomerTestHelpers(
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

  it('lists customers using the directory item response shape', async () => {
    const owner = await signUpOwner('owner@example.com');
    const createResponse = await createCustomer(owner.cookieHeader, {
      name: 'Acme Market',
      code: 'ACME',
      phoneNumber: '+90 555 111 11 11',
      address: 'Main Street 42',
    });
    const created = createCustomerResponseSchema.parse(await createResponse.json());

    const response = await fetch(`${backend!.baseUrl}/customers`, {
      headers: {
        cookie: owner.cookieHeader,
      },
    });

    expect(response.status).toBe(200);
    const listBody = await response.json();
    expect(listBody.items[0]).not.toHaveProperty('address');
    const list = customerListResponseSchema.parse(listBody);

    expect(list.items).toEqual([
      {
        id: created.id,
        name: 'Acme Market',
        code: 'ACME',
        phoneNumber: '+90 555 111 11 11',
        createdAt: created.createdAt,
        updatedAt: created.updatedAt,
        financialSummary: {
          balancesByCurrency: [],
        },
      },
    ]);
  });

  it('paginates customers without gaps or duplicates and returns truthful metadata', async () => {
    const owner = await signUpOwner('owner@example.com');

    for (let index = 1; index <= customerCountWithSecondPage; index += 1) {
      const suffix = index.toString().padStart(3, '0');

      await insertCustomer({
        ownerProfileId: owner.ownerProfileId,
        id: `customer_page_${suffix}`,
        name: `Page Customer ${suffix}`,
        code: `PAGE-${suffix}`,
        phoneNumber: `+90 555 200 ${suffix}`,
        createdAt: `2026-08-29 11:${index.toString().padStart(2, '0')}:00`,
      });
    }

    const firstPageResponse = await fetch(`${backend!.baseUrl}/customers`, {
      headers: {
        cookie: owner.cookieHeader,
      },
    });

    expect(firstPageResponse.status).toBe(200);
    const firstPage = customerListResponseSchema.parse(
      await firstPageResponse.json(),
    );

    expect(firstPage.items).toHaveLength(customerListPageSize);
    expect(firstPage).toMatchObject({
      page: 1,
      pageSize: customerListPageSize,
      totalItems: customerCountWithSecondPage,
      totalPages: expectedCustomerListTotalPages,
    });

    const secondPageResponse = await fetch(
      `${backend!.baseUrl}/customers?page=2`,
      {
        headers: {
          cookie: owner.cookieHeader,
        },
      },
    );

    expect(secondPageResponse.status).toBe(200);
    const secondPage = customerListResponseSchema.parse(
      await secondPageResponse.json(),
    );

    expect(secondPage.items).toHaveLength(1);
    expect(secondPage).toMatchObject({
      page: 2,
      pageSize: customerListPageSize,
      totalItems: customerCountWithSecondPage,
      totalPages: expectedCustomerListTotalPages,
    });

    const returnedCustomerIds = [...firstPage.items, ...secondPage.items]
      .map(({ id }) => id)
      .sort();
    const expectedCustomerIds = Array.from(
      { length: customerCountWithSecondPage },
      (_, index) => `customer_page_${(index + 1).toString().padStart(3, '0')}`,
    );

    expect(returnedCustomerIds).toEqual(expectedCustomerIds);
  });

  it('rejects an invalid customer page query with a validation error', async () => {
    const owner = await signUpOwner('owner@example.com');

    const response = await fetch(`${backend!.baseUrl}/customers?page=invalid`, {
      headers: {
        cookie: owner.cookieHeader,
      },
    });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toEqual(
      expect.objectContaining({
        code: 'VALIDATION_ERROR',
        message: 'Check the highlighted fields.',
      }),
    );
    expect(body.fieldErrors?.page).toEqual([
      expect.any(String),
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

  it('searches owner customers by name, code, and phone while excluding address matches', async () => {
    const firstOwner = await signUpOwner('first-owner@example.com');
    const secondOwner = await signUpOwner('second-owner@example.com');

    await insertCustomer({
      ownerProfileId: firstOwner.ownerProfileId,
      id: 'customer_search_name',
      name: 'North Ledger Market',
      code: 'NORTH-001',
      phoneNumber: '+90 555 410 00 01',
      createdAt: '2026-08-29 12:00:00',
    });
    await insertCustomer({
      ownerProfileId: firstOwner.ownerProfileId,
      id: 'customer_search_code',
      name: 'Harbor Supplies',
      code: 'LEDGER-002',
      phoneNumber: '+90 555 410 00 02',
      createdAt: '2026-08-29 12:00:00',
    });
    await insertCustomer({
      ownerProfileId: firstOwner.ownerProfileId,
      id: 'customer_search_phone',
      name: 'South Goods',
      code: 'SOUTH-003',
      phoneNumber: '+90 555 999 LEDGER',
      createdAt: '2026-08-29 11:00:00',
    });
    await insertCustomer({
      ownerProfileId: firstOwner.ownerProfileId,
      id: 'customer_search_address_only',
      name: 'Address Only',
      code: 'ADDRESS-004',
      phoneNumber: '+90 555 410 00 04',
      address: 'Ledger Avenue',
      createdAt: '2026-08-29 13:00:00',
    });
    await insertCustomer({
      ownerProfileId: secondOwner.ownerProfileId,
      id: 'customer_search_other_owner',
      name: 'Other Ledger Customer',
      code: 'OTHER-LEDGER',
      phoneNumber: '+90 555 410 00 05',
      createdAt: '2026-08-29 14:00:00',
    });

    const response = await fetch(`${backend!.baseUrl}/customers?search=ledger`, {
      headers: {
        cookie: firstOwner.cookieHeader,
      },
    });

    expect(response.status).toBe(200);
    const list = customerListResponseSchema.parse(await response.json());

    expect(list.items.map((customer) => customer.id).sort()).toEqual([
      'customer_search_code',
      'customer_search_name',
      'customer_search_phone',
    ]);
  });
});
