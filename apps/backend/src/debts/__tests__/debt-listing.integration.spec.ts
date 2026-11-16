import {
  debtListPageSize,
  debtListResponseSchema,
} from '@collectify/contracts';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { getIstanbulBusinessDate } from '../../shared/istanbul-business-date';
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

describe('debt listing', () => {
  let postgres!: IntegrationDatabase;
  let backend!: IntegrationBackend;
  let ownerAuth!: ReturnType<typeof createOwnerAuthClient>;
  let context!: DebtTestContext;

  const {
    signUpOwner,
    insertCustomer,
    insertDebt,
    insertPayment,
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

  it('combines multiple payments into exact one-payment debt progress', async () => {
    const owner = await signUpOwner('debt-payment-progress-owner@example.com');
    await insertCustomer(owner.ownerProfileId);
    await insertDebt({
      id: 'debt_payment_progress',
      createdAt: '2026-09-10 10:00:00',
      totalAmount: '100.00',
    });
    await insertPayment({
      id: 'payment_progress_first',
      scheduleItemId: 'debt_payment_progress_schedule',
      amount: '0.10',
      idempotencyKey: '00000000-0000-4000-8000-000000000001',
    });
    await insertPayment({
      id: 'payment_progress_second',
      scheduleItemId: 'debt_payment_progress_schedule',
      amount: '25.20',
      idempotencyKey: '00000000-0000-4000-8000-000000000002',
    });

    const response = await fetch(
      `${backend!.baseUrl}/customers/customer_debt/debts`,
      {
        headers: { cookie: owner.cookieHeader },
      },
    );

    expect(response.status).toBe(200);
    const list = debtListResponseSchema.parse(await response.json());
    expect(list.items[0]).toMatchObject({
      paidAmount: '25.30',
      remainingAmount: '74.70',
      paymentState: 'partiallyPaid',
      paymentCount: 2,
      scheduleItems: [
        {
          paidAmount: '25.30',
          remainingAmount: '74.70',
          paymentState: 'partiallyPaid',
          paymentCount: 2,
        },
      ],
    });
  });

  it('projects a fully paid one-payment debt with zero remaining balance', async () => {
    const owner = await signUpOwner('debt-paid-progress-owner@example.com');
    await insertCustomer(owner.ownerProfileId);
    await insertDebt({
      id: 'debt_paid_progress',
      createdAt: '2026-09-10 10:00:00',
      totalAmount: '100.00',
    });
    await insertPayment({
      id: 'payment_paid_progress',
      scheduleItemId: 'debt_paid_progress_schedule',
      amount: '100.00',
      idempotencyKey: '00000000-0000-4000-8000-000000000007',
    });

    const response = await fetch(
      `${backend!.baseUrl}/customers/customer_debt/debts`,
      {
        headers: { cookie: owner.cookieHeader },
      },
    );

    expect(response.status).toBe(200);
    const list = debtListResponseSchema.parse(await response.json());
    expect(list.items[0]).toMatchObject({
      paidAmount: '100.00',
      remainingAmount: '0.00',
      paymentState: 'paid',
      paymentCount: 1,
      scheduleItems: [
        {
          paidAmount: '100.00',
          remainingAmount: '0.00',
          paymentState: 'paid',
          paymentCount: 1,
        },
      ],
    });
  });

  it('projects mixed payment states for installment schedule items and debt totals', async () => {
    const owner = await signUpOwner('debt-mixed-progress-owner@example.com');
    await insertCustomer(owner.ownerProfileId);
    await insertDebt({
      id: 'debt_mixed_progress',
      createdAt: '2026-09-10 10:00:00',
      totalAmount: '100.00',
      scheduleItems: [
        {
          id: 'debt_mixed_progress_first',
          amount: '40.00',
          dueDate: '2026-09-30',
        },
        {
          id: 'debt_mixed_progress_second',
          amount: '35.00',
          dueDate: '2026-10-30',
        },
        {
          id: 'debt_mixed_progress_third',
          amount: '25.00',
          dueDate: '2026-11-30',
        },
      ],
    });
    await insertPayment({
      id: 'payment_mixed_progress_first',
      scheduleItemId: 'debt_mixed_progress_first',
      amount: '40.00',
      idempotencyKey: '00000000-0000-4000-8000-000000000008',
    });
    await insertPayment({
      id: 'payment_mixed_progress_second',
      scheduleItemId: 'debt_mixed_progress_second',
      amount: '10.00',
      idempotencyKey: '00000000-0000-4000-8000-000000000009',
    });

    const response = await fetch(
      `${backend!.baseUrl}/customers/customer_debt/debts`,
      {
        headers: { cookie: owner.cookieHeader },
      },
    );

    expect(response.status).toBe(200);
    const list = debtListResponseSchema.parse(await response.json());
    expect(list.items[0]).toMatchObject({
      paidAmount: '50.00',
      remainingAmount: '50.00',
      paymentState: 'partiallyPaid',
      paymentCount: 2,
      paymentPlanType: 'installment',
      scheduleItems: [
        {
          position: 1,
          amount: '40.00',
          paidAmount: '40.00',
          remainingAmount: '0.00',
          paymentState: 'paid',
          paymentCount: 1,
        },
        {
          position: 2,
          amount: '35.00',
          paidAmount: '10.00',
          remainingAmount: '25.00',
          paymentState: 'partiallyPaid',
          paymentCount: 1,
        },
        {
          position: 3,
          amount: '25.00',
          paidAmount: '0.00',
          remainingAmount: '25.00',
          paymentState: 'unpaid',
          paymentCount: 0,
        },
      ],
    });
  });

  it('returns the Istanbul timing for a debt schedule item', async () => {
    const owner = await signUpOwner('debt-timing-owner@example.com');
    await insertCustomer(owner.ownerProfileId);
    const dueDate = '2999-01-01';

    const response = await fetch(
      `${backend!.baseUrl}/customers/customer_debt/debts`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          cookie: owner.cookieHeader,
        },
        body: JSON.stringify({
          description: 'Timing debt',
          totalAmount: '125.50',
          currency: 'USD',
          scheduleItems: [
            {
              amount: '125.50',
              dueDate,
            },
          ],
        }),
      },
    );

    expect(response.status).toBe(201);
    const created = await response.json();

    expect(created.scheduleItems[0]).toMatchObject({
      dueDate,
      timing: 'upcoming',
    });
  });

  it('returns due-today and overdue timing for listed debts', async () => {
    const owner = await signUpOwner('debt-timing-list-owner@example.com');
    await insertCustomer(owner.ownerProfileId);
    await insertDebt({
      id: 'debt_timing_today',
      createdAt: '2026-09-07 10:00:00',
      dueDate: getIstanbulBusinessDate(new Date()),
    });
    await insertDebt({
      id: 'debt_timing_overdue',
      createdAt: '2026-09-06 10:00:00',
      dueDate: '1900-01-01',
    });

    const response = await fetch(
      `${backend!.baseUrl}/customers/customer_debt/debts`,
      {
        headers: {
          cookie: owner.cookieHeader,
        },
      },
    );

    expect(response.status).toBe(200);
    const list = debtListResponseSchema.parse(await response.json());

    expect(
      list.items.map((debt) => [
        debt.id,
        debt.scheduleItems[0].timing,
      ]),
    ).toEqual([
      ['debt_timing_overdue', 'overdue'],
      ['debt_timing_today', 'dueToday'],
    ]);
  });

  it('orders debt pages by due date, creation time, and debt ID', async () => {
    const owner = await signUpOwner('debt-priority-owner@example.com');
    await insertCustomer(owner.ownerProfileId);
    const businessDate = getIstanbulBusinessDate(new Date());

    await insertDebt({
      id: 'debt_priority_overdue_tie_b',
      createdAt: '2026-09-02 10:00:00',
      dueDate: '1900-01-02',
    });
    await insertDebt({
      id: 'debt_priority_overdue_tie_a',
      createdAt: '2026-09-02 10:00:00',
      dueDate: '1900-01-02',
    });
    await insertDebt({
      id: 'debt_priority_overdue_created_earlier',
      createdAt: '2026-09-01 10:00:00',
      dueDate: '1900-01-02',
    });
    await insertDebt({
      id: 'debt_priority_due_today',
      createdAt: '2026-09-03 10:00:00',
      dueDate: businessDate,
    });
    await insertDebt({
      id: 'debt_priority_upcoming_near',
      createdAt: '2026-09-04 10:00:00',
      dueDate: '2999-01-01',
    });
    await insertDebt({
      id: 'debt_priority_upcoming_far',
      createdAt: '2026-09-05 10:00:00',
      dueDate: '2999-01-02',
    });

    const requestPage = async (page: number) => {
      const response = await fetch(
        `${backend!.baseUrl}/customers/customer_debt/debts?page=${page}`,
        {
          headers: {
            cookie: owner.cookieHeader,
          },
        },
      );

      expect(response.status).toBe(200);
      return debtListResponseSchema.parse(await response.json());
    };

    const firstPage = await requestPage(1);
    const secondPage = await requestPage(2);

    expect(firstPage.items.map((debt) => debt.id)).toEqual([
      'debt_priority_overdue_created_earlier',
      'debt_priority_overdue_tie_a',
      'debt_priority_overdue_tie_b',
      'debt_priority_due_today',
      'debt_priority_upcoming_near',
    ]);
    expect(secondPage.items.map((debt) => debt.id)).toEqual([
      'debt_priority_upcoming_far',
    ]);
  });

  it('lists the first five debts by collection priority with truthful pagination metadata', async () => {
    const owner = await signUpOwner('debt-page-owner@example.com');
    await insertCustomer(owner.ownerProfileId);

    for (const debt of [
      { id: 'debt_page_001', createdAt: '2026-09-01 10:00:00' },
      { id: 'debt_page_002', createdAt: '2026-09-02 10:00:00' },
      { id: 'debt_page_003', createdAt: '2026-09-03 10:00:00' },
      { id: 'debt_page_004', createdAt: '2026-09-04 10:00:00' },
      { id: 'debt_page_005', createdAt: '2026-09-05 10:00:00' },
      { id: 'debt_page_006', createdAt: '2026-09-05 10:00:00' },
    ]) {
      await insertDebt(debt);
    }

    const response = await fetch(
      `${backend!.baseUrl}/customers/customer_debt/debts`,
      {
        headers: {
          cookie: owner.cookieHeader,
        },
      },
    );

    expect(response.status).toBe(200);
    const list = debtListResponseSchema.parse(await response.json());

    expect(list.items.map((debt) => debt.id)).toEqual([
      'debt_page_001',
      'debt_page_002',
      'debt_page_003',
      'debt_page_004',
      'debt_page_005',
    ]);
    expect(list).toMatchObject({
      page: 1,
      pageSize: 5,
      totalItems: 6,
      totalPages: 2,
    });
  });

  it('returns the requested debt page with truthful pagination metadata', async () => {
    const owner = await signUpOwner('debt-requested-page-owner@example.com');
    await insertCustomer(owner.ownerProfileId);

    for (const debt of [
      { id: 'debt_requested_page_001', createdAt: '2026-09-01 10:00:00' },
      { id: 'debt_requested_page_002', createdAt: '2026-09-02 10:00:00' },
      { id: 'debt_requested_page_003', createdAt: '2026-09-03 10:00:00' },
      { id: 'debt_requested_page_004', createdAt: '2026-09-04 10:00:00' },
      { id: 'debt_requested_page_005', createdAt: '2026-09-05 10:00:00' },
      { id: 'debt_requested_page_006', createdAt: '2026-09-05 10:00:00' },
    ]) {
      await insertDebt(debt);
    }

    const response = await fetch(
      `${backend!.baseUrl}/customers/customer_debt/debts?page=2`,
      {
        headers: {
          cookie: owner.cookieHeader,
        },
      },
    );

    expect(response.status).toBe(200);
    const list = debtListResponseSchema.parse(await response.json());

    expect(list.items.map((debt) => debt.id)).toEqual([
      'debt_requested_page_006',
    ]);
    expect(list).toMatchObject({
      page: 2,
      pageSize: debtListPageSize,
      totalItems: 6,
      totalPages: 2,
    });
  });

  it('filters an authenticated debt list by description with scoped ordering and pagination', async () => {
    const owner = await signUpOwner('debt-search-owner@example.com');
    await insertCustomer(owner.ownerProfileId, {
      code: 'DEBT-SEARCH-001',
      id: 'customer_debt_search',
    });

    const businessDate = getIstanbulBusinessDate(new Date());
    const matchingDebts = [
      {
        createdAt: '2026-09-01 10:00:00',
        description: 'Storefront REPAIR',
        dueDate: '1900-01-01',
        id: 'debt_search_overdue_earliest',
      },
      {
        createdAt: '2026-09-02 10:00:00',
        description: 'Repair appointment',
        dueDate: '1900-01-02',
        id: 'debt_search_overdue_next',
      },
      {
        createdAt: '2026-09-03 10:00:00',
        description: 'Emergency repair',
        dueDate: businessDate,
        id: 'debt_search_due_today',
      },
      {
        createdAt: '2026-09-04 10:00:00',
        description: 'Repair materials',
        dueDate: '2999-01-01',
        id: 'debt_search_upcoming_near',
      },
      {
        createdAt: '2026-09-05 10:00:00',
        description: 'Final repair visit',
        dueDate: '2999-01-02',
        id: 'debt_search_upcoming_far_a',
      },
      {
        createdAt: '2026-09-06 10:00:00',
        description: 'Post-repair inspection',
        dueDate: '2999-01-03',
        id: 'debt_search_upcoming_far_b',
      },
    ];

    for (const debt of matchingDebts) {
      await insertDebt({
        ...debt,
        customerId: 'customer_debt_search',
      });
    }
    await insertDebt({
      createdAt: '2026-09-07 10:00:00',
      customerId: 'customer_debt_search',
      currency: 'EUR',
      description: 'Office supplies',
      id: 'debt_search_nonmatching',
      totalAmount: '999.99',
    });

    const requestPage = async (page: number) => {
      const response = await fetch(
        `${backend!.baseUrl}/customers/customer_debt_search/debts?search=REPAIR&page=${page}`,
        {
          headers: {
            cookie: owner.cookieHeader,
          },
        },
      );

      expect(response.status).toBe(200);
      return debtListResponseSchema.parse(await response.json());
    };

    const firstPage = await requestPage(1);
    const secondPage = await requestPage(2);

    expect(firstPage.items.map((debt) => debt.id)).toEqual([
      'debt_search_overdue_earliest',
      'debt_search_overdue_next',
      'debt_search_due_today',
      'debt_search_upcoming_near',
      'debt_search_upcoming_far_a',
    ]);
    expect(secondPage.items.map((debt) => debt.id)).toEqual([
      'debt_search_upcoming_far_b',
    ]);
    expect(firstPage).toMatchObject({
      page: 1,
      pageSize: debtListPageSize,
      totalItems: 6,
      totalPages: 2,
    });
    expect(secondPage).toMatchObject({
      page: 2,
      pageSize: debtListPageSize,
      totalItems: 6,
      totalPages: 2,
    });
  });

  it('treats debt search metacharacters literally', async () => {
    const { requestPage } = await setupLiteralSearchScenario();

    const percentSearch = await requestPage('100%');
    const underscoreSearch = await requestPage('A_B');
    const backslashSearch = await requestPage('C:\\Temp');

    expect(percentSearch.items.map((debt) => debt.id)).toEqual([
      'debt_search_literal_percent',
    ]);
    expect(underscoreSearch.items.map((debt) => debt.id)).toEqual([
      'debt_search_literal_underscore',
    ]);
    expect(backslashSearch.items.map((debt) => debt.id)).toEqual([
      'debt_search_literal_backslash',
    ]);
  });

  it('treats whitespace-only debt search as unfiltered', async () => {
    const { requestPage } = await setupLiteralSearchScenario();

    const unfiltered = await requestPage();
    const whitespaceSearch = await requestPage('   ');

    expect(whitespaceSearch).toEqual(unfiltered);
  });

  it('rejects a malformed debt page query with a validation error', async () => {
    const owner = await signUpOwner('debt-invalid-page-owner@example.com');

    const response = await fetch(
      `${backend!.baseUrl}/customers/customer_debt/debts?page=invalid`,
      {
        headers: {
          cookie: owner.cookieHeader,
        },
      },
    );

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

  async function setupLiteralSearchScenario() {
    const owner = await signUpOwner('debt-search-literal-owner@example.com');
    await insertCustomer(owner.ownerProfileId, {
      code: 'DEBT-SEARCH-LITERAL',
      id: 'customer_debt_search_literal',
    });

    for (const debt of [
      {
        createdAt: '2026-09-01 10:00:00',
        description: 'Discount 100%',
        id: 'debt_search_literal_percent',
      },
      {
        createdAt: '2026-09-02 10:00:00',
        description: 'Discount 1000',
        id: 'debt_search_percent_decoy',
      },
      {
        createdAt: '2026-09-03 10:00:00',
        description: 'Room A_B',
        id: 'debt_search_literal_underscore',
      },
      {
        createdAt: '2026-09-04 10:00:00',
        description: 'Room A1B',
        id: 'debt_search_underscore_decoy',
      },
      {
        createdAt: '2026-09-05 10:00:00',
        description: 'Path C:\\Temp',
        id: 'debt_search_literal_backslash',
      },
      {
        createdAt: '2026-09-06 10:00:00',
        description: 'Path C:Temp',
        id: 'debt_search_backslash_decoy',
      },
    ]) {
      await insertDebt({
        ...debt,
        customerId: 'customer_debt_search_literal',
      });
    }

    const requestPage = async (search?: string) => {
      const searchParams = new URLSearchParams({ page: '1' });

      if (search !== undefined) {
        searchParams.set('search', search);
      }

      const response = await fetch(
        `${backend!.baseUrl}/customers/customer_debt_search_literal/debts?${searchParams.toString()}`,
        {
          headers: {
            cookie: owner.cookieHeader,
          },
        },
      );

      expect(response.status).toBe(200);
      return debtListResponseSchema.parse(await response.json());
    };

    return { requestPage };
  }
});
