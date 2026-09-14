import {
  createCustomerResponseSchema,
  customerDetailsResponseSchema,
  customerListPageSize,
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
  const customerCountWithSecondPage = customerListPageSize + 1;
  const expectedCustomerListTotalPages = 2;

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
    const createdBody = await createResponse.json();
    expect(createdBody.financialSummary).toEqual([]);
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

  it('includes debt balances in customer details', async () => {
    const owner = await signUpOwner('customer-financials-owner@example.com');
    const createResponse = await createCustomer(owner.cookieHeader, {
      name: 'Acme Market',
      code: 'ACME-001',
      phoneNumber: '+90 555 123 45 67',
    });
    const created = createCustomerResponseSchema.parse(
      await createResponse.json(),
    );

    const debtResponse = await fetch(
      `${backend!.baseUrl}/customers/${created.id}/debts`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          cookie: owner.cookieHeader,
        },
        body: JSON.stringify({
          description: 'Website redesign',
          totalAmount: '125.50',
          currency: 'USD',
          paymentPlan: {
            type: 'onePayment',
            dueDate: '2999-01-01',
          },
        }),
      },
    );

    expect(debtResponse.status).toBe(201);

    const detailsResponse = await fetch(
      `${backend!.baseUrl}/customers/${created.id}`,
      {
        headers: {
          cookie: owner.cookieHeader,
        },
      },
    );

    expect(detailsResponse.status).toBe(200);
    const details = customerDetailsResponseSchema.parse(
      await detailsResponse.json(),
    );

    expect(details.financialSummary).toEqual([
      {
        currency: 'USD',
        totalDebtAmount: '125.50',
        totalPaidAmount: '0.00',
        remainingAmount: '125.50',
      },
    ]);
  });

  it('updates only the submitted customer fields', async () => {
    const owner = await signUpOwner('owner@example.com');
    const createResponse = await createCustomer(owner.cookieHeader, {
      name: 'Acme Market',
      code: 'ACME-001',
      phoneNumber: '+90 555 123 45 67',
      address: 'Main Street 42',
    });
    const created = createCustomerResponseSchema.parse(await createResponse.json());

    const response = await updateCustomer(owner.cookieHeader, created.id, {
      name: '  Acme Wholesale  ',
    });

    expect(response.status).toBe(200);
    const updated = customerDetailsResponseSchema.parse(await response.json());
    expect(updated).toMatchObject({
      id: created.id,
      name: 'Acme Wholesale',
      code: 'ACME-001',
      phoneNumber: '+90 555 123 45 67',
      address: 'Main Street 42',
    });
  });

  it('clears customer address when address is submitted blank', async () => {
    const owner = await signUpOwner('owner@example.com');
    const createResponse = await createCustomer(owner.cookieHeader, {
      name: 'Acme Market',
      code: 'ACME-001',
      phoneNumber: '+90 555 123 45 67',
      address: 'Main Street 42',
    });
    const created = createCustomerResponseSchema.parse(await createResponse.json());

    const clearAddressResponse = await updateCustomer(
      owner.cookieHeader,
      created.id,
      {
        address: '   ',
      },
    );

    expect(clearAddressResponse.status).toBe(200);
    const clearedAddress = customerDetailsResponseSchema.parse(
      await clearAddressResponse.json(),
    );
    expect(clearedAddress).toMatchObject({
      id: created.id,
      name: 'Acme Market',
      code: 'ACME-001',
      phoneNumber: '+90 555 123 45 67',
      address: null,
    });
  });

  it('rejects invalid customer update input with field errors', async () => {
    const owner = await signUpOwner('owner@example.com');

    const response = await updateCustomer(owner.cookieHeader, 'customer_123', {
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

  it('rejects duplicate customer code on update only within the same owner', async () => {
    const firstOwner = await signUpOwner('first-owner@example.com');
    const secondOwner = await signUpOwner('second-owner@example.com');

    expect(
      await createCustomer(firstOwner.cookieHeader, {
        name: 'Acme Market',
        code: 'ACME',
        phoneNumber: '+90 555 111 11 11',
      }),
    ).toHaveProperty('status', 201);
    const firstOwnerSecondCustomerResponse = await createCustomer(
      firstOwner.cookieHeader,
      {
        name: 'Harbor Supplies',
        code: 'HARBOR',
        phoneNumber: '+90 555 222 22 22',
      },
    );
    expect(firstOwnerSecondCustomerResponse).toHaveProperty('status', 201);
    expect(
      await createCustomer(secondOwner.cookieHeader, {
        name: 'Other Acme',
        code: 'acme',
        phoneNumber: '+90 555 333 33 33',
      }),
    ).toHaveProperty('status', 201);
    const firstOwnerSecondCustomer = createCustomerResponseSchema.parse(
      await firstOwnerSecondCustomerResponse.json(),
    );

    const duplicateResponse = await updateCustomer(
      firstOwner.cookieHeader,
      firstOwnerSecondCustomer.id,
      {
        code: ' acme ',
      },
    );

    expect(duplicateResponse.status).toBe(409);
    await expect(duplicateResponse.json()).resolves.toEqual({
      code: 'CUSTOMER_CODE_ALREADY_EXISTS',
      message: 'A customer with this code already exists.',
      fieldErrors: {
        code: ['A customer with this code already exists.'],
      },
    });
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
    expect(listBody.items[0].financialSummary).toEqual({
      balancesByCurrency: [],
    });
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

  it('includes debt balances in customer directory items by default currency', async () => {
    const owner = await signUpOwner('customer-directory-financials-owner@example.com');
    const createResponse = await createCustomer(owner.cookieHeader, {
      name: 'Acme Market',
      code: 'ACME-001',
      phoneNumber: '+90 555 123 45 67',
    });
    const created = createCustomerResponseSchema.parse(
      await createResponse.json(),
    );

    for (const debt of [
      {
        description: 'EUR overdue debt',
        totalAmount: '40.00',
        currency: 'EUR',
        dueDate: '2000-01-01',
      },
      {
        description: 'USD upcoming debt',
        totalAmount: '25.50',
        currency: 'USD',
        dueDate: '2999-01-01',
      },
    ]) {
      const debtResponse = await fetch(
        `${backend!.baseUrl}/customers/${created.id}/debts`,
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            cookie: owner.cookieHeader,
          },
          body: JSON.stringify({
            description: debt.description,
            totalAmount: debt.totalAmount,
            currency: debt.currency,
            paymentPlan: {
              type: 'onePayment',
              dueDate: debt.dueDate,
            },
          }),
        },
      );

      expect(debtResponse.status).toBe(201);
    }

    const response = await fetch(`${backend!.baseUrl}/customers`, {
      headers: {
        cookie: owner.cookieHeader,
      },
    });

    expect(response.status).toBe(200);
    const list = customerListResponseSchema.parse(await response.json());

    expect(list.items[0]?.financialSummary).toEqual({
      balancesByCurrency: [
        {
          currency: 'USD',
          remainingAmount: '25.50',
          overdueAmount: '0.00',
        },
        {
          currency: 'EUR',
          remainingAmount: '40.00',
          overdueAmount: '40.00',
        },
      ],
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

  it('caps the customer list to the first page and returns truthful page metadata', async () => {
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

    const response = await fetch(`${backend!.baseUrl}/customers`, {
      headers: {
        cookie: owner.cookieHeader,
      },
    });

    expect(response.status).toBe(200);
    const list = customerListResponseSchema.parse(await response.json());

    expect(list.items).toHaveLength(customerListPageSize);
    expect(list).toMatchObject({
      page: 1,
      pageSize: customerListPageSize,
      totalItems: customerCountWithSecondPage,
      totalPages: expectedCustomerListTotalPages,
    });
  });

  it('returns the requested customer page with truthful pagination metadata', async () => {
    const owner = await signUpOwner('owner@example.com');

    for (let index = 1; index <= customerCountWithSecondPage; index += 1) {
      const suffix = index.toString().padStart(3, '0');

      await insertCustomer({
        ownerProfileId: owner.ownerProfileId,
        id: `customer_requested_page_${suffix}`,
        name: `Requested Page Customer ${suffix}`,
        code: `REQUESTED-PAGE-${suffix}`,
        phoneNumber: `+90 555 300 ${suffix}`,
        createdAt: `2026-08-29 11:${index.toString().padStart(2, '0')}:00`,
      });
    }

    const response = await fetch(`${backend!.baseUrl}/customers?page=2`, {
      headers: {
        cookie: owner.cookieHeader,
      },
    });

    expect(response.status).toBe(200);
    const list = customerListResponseSchema.parse(await response.json());

    expect(list.items.map((customer) => customer.id)).toEqual([
      'customer_requested_page_001',
    ]);
    expect(list).toMatchObject({
      page: 2,
      pageSize: customerListPageSize,
      totalItems: customerCountWithSecondPage,
      totalPages: expectedCustomerListTotalPages,
    });
  });

  it('falls back to the first customer page when the page query is invalid', async () => {
    const owner = await signUpOwner('owner@example.com');

    for (let index = 1; index <= customerCountWithSecondPage; index += 1) {
      const suffix = index.toString().padStart(3, '0');

      await insertCustomer({
        ownerProfileId: owner.ownerProfileId,
        id: `customer_invalid_page_${suffix}`,
        name: `Invalid Page Customer ${suffix}`,
        code: `INVALID-PAGE-${suffix}`,
        phoneNumber: `+90 555 305 ${suffix}`,
        createdAt: `2026-08-29 11:${index.toString().padStart(2, '0')}:00`,
      });
    }

    const response = await fetch(`${backend!.baseUrl}/customers?page=invalid`, {
      headers: {
        cookie: owner.cookieHeader,
      },
    });

    expect(response.status).toBe(200);
    const list = customerListResponseSchema.parse(await response.json());

    expect(list.items).toHaveLength(customerListPageSize);
    expect(list.items[0]).toMatchObject({
      id: `customer_invalid_page_${customerCountWithSecondPage
        .toString()
        .padStart(3, '0')}`,
    });
    expect(list).toMatchObject({
      page: 1,
      pageSize: customerListPageSize,
      totalItems: customerCountWithSecondPage,
      totalPages: expectedCustomerListTotalPages,
    });
  });

  it('keeps page boundaries stable when customers share the same creation time', async () => {
    const owner = await signUpOwner('owner@example.com');

    for (let index = 1; index <= customerCountWithSecondPage; index += 1) {
      const suffix = index.toString().padStart(3, '0');
      const createdAt =
        index <= 2
          ? '2026-08-29 11:02:00'
          : `2026-08-29 11:${index.toString().padStart(2, '0')}:00`;

      await insertCustomer({
        ownerProfileId: owner.ownerProfileId,
        id: `customer_boundary_${suffix}`,
        name: `Boundary Customer ${suffix}`,
        code: `BOUNDARY-${suffix}`,
        phoneNumber: `+90 555 310 ${suffix}`,
        createdAt,
      });
    }

    const response = await fetch(`${backend!.baseUrl}/customers?page=2`, {
      headers: {
        cookie: owner.cookieHeader,
      },
    });

    expect(response.status).toBe(200);
    const list = customerListResponseSchema.parse(await response.json());

    expect(list.items.map((customer) => customer.id)).toEqual([
      'customer_boundary_001',
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

    expect(list.items.map((customer) => customer.id)).toEqual([
      'customer_search_name',
      'customer_search_code',
      'customer_search_phone',
    ]);
    expect(list).toMatchObject({
      page: 1,
      pageSize: customerListPageSize,
      totalItems: 3,
      totalPages: 1,
    });
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

  function updateCustomer(
    cookieHeader: string,
    customerId: string,
    body: unknown,
  ): Promise<Response> {
    return fetch(`${backend!.baseUrl}/customers/${customerId}`, {
      method: 'PATCH',
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
    address,
    id,
    name,
    ownerProfileId,
    phoneNumber,
  }: {
    address?: string;
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
          "address",
          "created_at",
          "updated_at"
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7::timestamp, $7::timestamp)
      `,
      [id, ownerProfileId, name, code, phoneNumber, address ?? null, createdAt],
    );
  }
});
