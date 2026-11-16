import { debtListResponseSchema } from '@collectify/contracts';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { createOwnerAuthClient } from '../../test-support/owner-auth-client';
import {
  createIntegrationDatabase,
  startIntegrationBackend,
  type IntegrationBackend,
  type IntegrationDatabase,
} from '../../test-support/integration-test-support';
import {
  createDebtTestHelpers,
  type DebtTestContext,
} from './debt-integration-test-support';

type DebtAccessFixture = {
  ownerCookieHeader: string;
  ownedCustomerId: string;
  wrongPathCustomerId: string;
  ownedDebtId: string;
  otherOwnerCustomerId: string;
  otherOwnerDebtId: string;
};

type DebtOperationResult = {
  scenario: string;
  status: number;
  body: unknown;
};

const debtNotFoundBody = {
  code: 'DEBT_NOT_FOUND',
  message: 'Debt was not found.',
} as const;

describe('debt access control', () => {
  let postgres!: IntegrationDatabase;
  let backend!: IntegrationBackend;
  let ownerAuth!: ReturnType<typeof createOwnerAuthClient>;
  let context!: DebtTestContext;

  const {
    signUpOwner,
    insertCustomer,
    insertDebt,
    replaceDebtRequest,
    readDebtWithScheduleRows,
  } = createDebtTestHelpers(() => context);

  beforeAll(async () => {
    postgres = createIntegrationDatabase();
    backend = await startIntegrationBackend();
    ownerAuth = createOwnerAuthClient(backend.baseUrl);
    context = { database: postgres, backend, ownerAuth };
  });

  beforeEach(async () => {
    await postgres.reset();
  });

  afterAll(async () => {
    await backend.app.close();
  });

  it('rejects inaccessible debt replacement with the same not-found response and no changes', async () => {
    const fixture = await seedDebtAccessFixture();
    const beforeOwnedDebt = await readDebtWithScheduleRows(fixture.ownedDebtId);
    const beforeOtherOwnerDebt = await readDebtWithScheduleRows(
      fixture.otherOwnerDebtId,
    );
    const requestBody = {
      expectedVersion: 1,
      description: 'Should not be saved',
      totalAmount: '999.99',
      currency: 'EUR',
      scheduleItems: [
        {
          amount: '999.99',
          dueDate: '2026-10-01',
        },
      ],
    };

    const results = await Promise.all([
      readOperationResult(
        'missing debt',
        replaceDebtRequest(
          fixture.ownerCookieHeader,
          'debt_missing',
          requestBody,
          fixture.ownedCustomerId,
        ),
      ),
      readOperationResult(
        'wrong customer path',
        replaceDebtRequest(
          fixture.ownerCookieHeader,
          fixture.ownedDebtId,
          requestBody,
          fixture.wrongPathCustomerId,
        ),
      ),
      readOperationResult(
        'another owner debt',
        replaceDebtRequest(
          fixture.ownerCookieHeader,
          fixture.otherOwnerDebtId,
          requestBody,
          fixture.otherOwnerCustomerId,
        ),
      ),
    ]);

    expectDebtNotFoundResults(results);
    expect(await readDebtWithScheduleRows(fixture.ownedDebtId)).toEqual(
      beforeOwnedDebt,
    );
    expect(await readDebtWithScheduleRows(fixture.otherOwnerDebtId)).toEqual(
      beforeOtherOwnerDebt,
    );
  });

  it('rejects inaccessible debt deletion with the same not-found response and no changes', async () => {
    const fixture = await seedDebtAccessFixture();
    const beforeOwnedDebt = await readDebtWithScheduleRows(fixture.ownedDebtId);
    const beforeOtherOwnerDebt = await readDebtWithScheduleRows(
      fixture.otherOwnerDebtId,
    );

    const deleteDebt = (customerId: string, debtId: string) =>
      fetch(`${backend.baseUrl}/customers/${customerId}/debts/${debtId}`, {
        method: 'DELETE',
        headers: {
          cookie: fixture.ownerCookieHeader,
        },
      });

    const results = await Promise.all([
      readOperationResult(
        'missing debt',
        deleteDebt(fixture.ownedCustomerId, 'debt_missing'),
      ),
      readOperationResult(
        'wrong customer path',
        deleteDebt(fixture.wrongPathCustomerId, fixture.ownedDebtId),
      ),
      readOperationResult(
        'another owner debt',
        deleteDebt(fixture.otherOwnerCustomerId, fixture.otherOwnerDebtId),
      ),
    ]);

    expectDebtNotFoundResults(results);
    expect(await readDebtWithScheduleRows(fixture.ownedDebtId)).toEqual(
      beforeOwnedDebt,
    );
    expect(await readDebtWithScheduleRows(fixture.otherOwnerDebtId)).toEqual(
      beforeOtherOwnerDebt,
    );
  });

  it('returns the same not-found response when listing debts for a missing or non-owned customer', async () => {
    const firstOwner = await signUpOwner('debt-first-owner@example.com');
    const secondOwner = await signUpOwner('debt-second-owner@example.com');
    await insertCustomer(firstOwner.ownerProfileId);

    const missingResponse = await fetch(
      `${backend!.baseUrl}/customers/missing/debts`,
      {
        headers: {
          cookie: firstOwner.cookieHeader,
        },
      },
    );
    const nonOwnedResponse = await fetch(
      `${backend!.baseUrl}/customers/customer_debt/debts`,
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

  it('lists only debts belonging to the requested customer', async () => {
    const owner = await signUpOwner('debt-list-isolation-owner@example.com');
    await insertCustomer(owner.ownerProfileId, {
      id: 'customer_list_requested',
      code: 'DEBT-LIST-REQUESTED',
    });
    await insertCustomer(owner.ownerProfileId, {
      id: 'customer_list_other',
      code: 'DEBT-LIST-OTHER',
    });
    await insertDebt({
      id: 'debt_list_requested',
      customerId: 'customer_list_requested',
      createdAt: '2026-09-05 10:00:00',
    });
    await insertDebt({
      id: 'debt_list_other',
      customerId: 'customer_list_other',
      createdAt: '2026-09-06 10:00:00',
    });

    const response = await fetch(
      `${backend.baseUrl}/customers/customer_list_requested/debts`,
      {
        headers: {
          cookie: owner.cookieHeader,
        },
      },
    );

    expect(response.status).toBe(200);
    const list = debtListResponseSchema.parse(await response.json());

    expect(list.items.map((debt) => debt.id)).toEqual(['debt_list_requested']);
    expect(list).toMatchObject({
      page: 1,
      pageSize: 5,
      totalItems: 1,
      totalPages: 1,
    });
  });

  async function seedDebtAccessFixture(): Promise<DebtAccessFixture> {
    const owner = await signUpOwner('debt-not-found-owner@example.com');
    await insertCustomer(owner.ownerProfileId, {
      id: 'customer_owned',
      code: 'DEBT-OWNED',
    });
    await insertCustomer(owner.ownerProfileId, {
      id: 'customer_wrong_path',
      code: 'DEBT-WRONG-PATH',
    });
    await insertDebt({
      id: 'debt_owned',
      customerId: 'customer_owned',
      createdAt: '2026-09-10 10:00:00',
    });

    const otherOwner = await signUpOwner('debt-not-found-other-owner@example.com');
    await insertCustomer(otherOwner.ownerProfileId, {
      id: 'customer_other_owner',
      code: 'DEBT-OTHER-OWNER',
    });
    await insertDebt({
      id: 'debt_other_owner',
      customerId: 'customer_other_owner',
      createdAt: '2026-09-11 10:00:00',
    });

    return {
      ownerCookieHeader: owner.cookieHeader,
      ownedCustomerId: 'customer_owned',
      wrongPathCustomerId: 'customer_wrong_path',
      ownedDebtId: 'debt_owned',
      otherOwnerCustomerId: 'customer_other_owner',
      otherOwnerDebtId: 'debt_other_owner',
    };
  }

  async function readOperationResult(
    scenario: string,
    responsePromise: Promise<Response>,
  ): Promise<DebtOperationResult> {
    const response = await responsePromise;

    return {
      scenario,
      status: response.status,
      body: await response.json(),
    };
  }

  function expectDebtNotFoundResults(results: DebtOperationResult[]): void {
    expect(results).toEqual([
      { scenario: 'missing debt', status: 404, body: debtNotFoundBody },
      { scenario: 'wrong customer path', status: 404, body: debtNotFoundBody },
      { scenario: 'another owner debt', status: 404, body: debtNotFoundBody },
    ]);
  }
});
