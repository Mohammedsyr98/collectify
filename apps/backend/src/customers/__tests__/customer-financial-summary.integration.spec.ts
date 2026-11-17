import {
  createCustomerResponseSchema,
  customerDetailsResponseSchema,
  customerListResponseSchema,
} from '@collectify/contracts';
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

describe('customer financial summaries', () => {
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

  it('projects an unpaid debt into the customer details financial summary', async () => {
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
          scheduleItems: [
            {
              amount: '125.50',
              dueDate: '2999-01-01',
            },
          ],
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

  it('exposes receivable balances in customer directory items', async () => {
    const owner = await signUpOwner('customer-directory-financials-owner@example.com');
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
          description: 'Upcoming USD debt',
          totalAmount: '25.50',
          currency: 'USD',
          scheduleItems: [
            {
              amount: '25.50',
              dueDate: '2999-01-01',
            },
          ],
        }),
      },
    );

    expect(debtResponse.status).toBe(201);

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
      ],
    });
  });
});
