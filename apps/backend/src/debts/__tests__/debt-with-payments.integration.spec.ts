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

describe('debt changes with recorded payments', () => {
  let postgres!: IntegrationDatabase;
  let backend!: IntegrationBackend;
  let ownerAuth!: ReturnType<typeof createOwnerAuthClient>;
  let context!: DebtTestContext;

  const {
    signUpOwner,
    insertCustomer,
    insertDebt,
    insertPayment,
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

  it('permanently deletes an owned one-payment debt and its schedule', async () => {
    const owner = await signUpOwner('debt-delete-owner@example.com');
    await insertCustomer(owner.ownerProfileId);
    await insertDebt({
      id: 'debt_delete',
      createdAt: '2026-09-10 10:00:00',
      description: 'Debt to delete',
    });

    expect(await readDebtWithScheduleRows('debt_delete')).toHaveLength(1);

    const response = await fetch(
      `${backend!.baseUrl}/customers/customer_debt/debts/debt_delete`,
      {
        method: 'DELETE',
        headers: {
          cookie: owner.cookieHeader,
        },
      },
    );

    expect(response.status).toBe(204);
    expect(await response.text()).toBe('');

    const remainingRows = await postgres!.query<{
      debt_count: number;
      schedule_count: number;
    }>(
      `
        SELECT
          (SELECT count(*)::int FROM "debts" WHERE "id" = $1) AS "debt_count",
          (SELECT count(*)::int FROM "debt_schedule_items" WHERE "debt_id" = $1) AS "schedule_count"
      `,
      ['debt_delete'],
    );

    expect(remainingRows).toEqual([
      {
        debt_count: 0,
        schedule_count: 0,
      },
    ]);
  });

  it('rejects deleting a debt with recorded payments without changing its rows', async () => {
    const owner = await signUpOwner('debt-delete-paid-owner@example.com');
    await insertCustomer(owner.ownerProfileId);
    await insertDebt({
      id: 'debt_delete_paid',
      createdAt: '2026-09-10 10:00:00',
      totalAmount: '100.00',
    });
    await insertPayment({
      id: 'payment_delete_paid',
      scheduleItemId: 'debt_delete_paid_schedule',
      amount: '25.00',
      idempotencyKey: '00000000-0000-4000-8000-000000000020',
    });

    const response = await fetch(
      `${backend!.baseUrl}/customers/customer_debt/debts/debt_delete_paid`,
      {
        method: 'DELETE',
        headers: { cookie: owner.cookieHeader },
      },
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      code: 'DEBT_HAS_PAYMENTS',
    });
    expect(await readDebtWithScheduleRows('debt_delete_paid')).toHaveLength(1);
    expect(
      await postgres!.query(
        'SELECT count(*)::int AS count FROM "payments" WHERE "schedule_item_id" = $1',
        ['debt_delete_paid_schedule'],
      ),
    ).toEqual([{ count: 1 }]);
  });

  it('rejects changing currency after a payment is recorded without changing the debt', async () => {
    const owner = await signUpOwner('debt-currency-lock-owner@example.com');
    await insertCustomer(owner.ownerProfileId);
    await insertDebt({
      id: 'debt_currency_lock',
      createdAt: '2026-09-10 10:00:00',
      totalAmount: '100.00',
      currency: 'USD',
    });
    await insertPayment({
      id: 'payment_currency_lock',
      scheduleItemId: 'debt_currency_lock_schedule',
      amount: '25.00',
      idempotencyKey: '00000000-0000-4000-8000-000000000021',
    });
    const before = await readDebtWithScheduleRows('debt_currency_lock');

    const response = await replaceDebtRequest(owner.cookieHeader, 'debt_currency_lock', {
      expectedVersion: 1,
      description: 'Updated description',
      totalAmount: '100.00',
      currency: 'EUR',
      scheduleItems: [
        {
          id: 'debt_currency_lock_schedule',
          amount: '100.00',
          dueDate: '2026-10-30',
        },
      ],
    });

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      code: 'DEBT_CURRENCY_CHANGE_BLOCKED',
    });
    expect(await readDebtWithScheduleRows('debt_currency_lock')).toEqual(before);
  });

  it('rejects converting a one-payment debt with a recorded payment to installments', async () => {
    const owner = await signUpOwner('debt-plan-lock-owner@example.com');
    await insertCustomer(owner.ownerProfileId);
    await insertDebt({
      id: 'debt_plan_lock',
      createdAt: '2026-09-10 10:00:00',
      totalAmount: '100.00',
      scheduleItems: [
        {
          id: 'debt_plan_lock_schedule',
          amount: '100.00',
          dueDate: '2026-09-30',
        },
      ],
    });
    await insertPayment({
      id: 'payment_plan_lock',
      scheduleItemId: 'debt_plan_lock_schedule',
      amount: '25.00',
      idempotencyKey: '00000000-0000-4000-8000-000000000022',
    });
    const before = await readDebtWithScheduleRows('debt_plan_lock');

    const response = await replaceDebtRequest(owner.cookieHeader, 'debt_plan_lock', {
      expectedVersion: 1,
      description: 'Split payment',
      totalAmount: '100.00',
      currency: 'USD',
      scheduleItems: [
        { amount: '40.00', dueDate: '2026-10-30' },
        {
          id: 'debt_plan_lock_schedule',
          amount: '60.00',
          dueDate: '2026-11-30',
        },
      ],
    });

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      code: 'DEBT_PAYMENT_PLAN_CHANGE_BLOCKED',
    });
    expect(await readDebtWithScheduleRows('debt_plan_lock')).toEqual(before);
  });

  it('rejects removing a paid installment while retaining the unpaid installment', async () => {
    const owner = await signUpOwner('debt-schedule-lock-owner@example.com');
    await insertCustomer(owner.ownerProfileId);
    await insertDebt({
      id: 'debt_schedule_lock',
      createdAt: '2026-09-10 10:00:00',
      totalAmount: '100.00',
      scheduleItems: [
        {
          id: 'debt_schedule_lock_paid',
          amount: '50.00',
          dueDate: '2026-09-30',
        },
        {
          id: 'debt_schedule_lock_unpaid',
          amount: '50.00',
          dueDate: '2026-10-30',
        },
      ],
    });
    await insertPayment({
      id: 'payment_schedule_lock',
      scheduleItemId: 'debt_schedule_lock_paid',
      amount: '25.00',
      idempotencyKey: '00000000-0000-4000-8000-000000000023',
    });
    const before = await readDebtWithScheduleRows('debt_schedule_lock');

    const response = await replaceDebtRequest(owner.cookieHeader, 'debt_schedule_lock', {
      expectedVersion: 1,
      description: 'Retain unpaid installment',
      totalAmount: '100.00',
      currency: 'USD',
      scheduleItems: [
        { amount: '25.00', dueDate: '2026-09-30' },
        {
          id: 'debt_schedule_lock_unpaid',
          amount: '75.00',
          dueDate: '2026-10-30',
        },
      ],
    });

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      code: 'DEBT_SCHEDULE_ITEM_HAS_PAYMENTS',
    });
    expect(await readDebtWithScheduleRows('debt_schedule_lock')).toEqual(before);
  });

  it('rejects reducing a paid schedule item below its received amount', async () => {
    const owner = await signUpOwner('debt-amount-lock-owner@example.com');
    await insertCustomer(owner.ownerProfileId);
    await insertDebt({
      id: 'debt_amount_lock',
      createdAt: '2026-09-10 10:00:00',
      totalAmount: '100.00',
    });
    await insertPayment({
      id: 'payment_amount_lock',
      scheduleItemId: 'debt_amount_lock_schedule',
      amount: '25.30',
      idempotencyKey: '00000000-0000-4000-8000-000000000024',
    });
    const before = await readDebtWithScheduleRows('debt_amount_lock');

    const response = await replaceDebtRequest(owner.cookieHeader, 'debt_amount_lock', {
      expectedVersion: 1,
      description: 'Too small',
      totalAmount: '20.00',
      currency: 'USD',
      scheduleItems: [
        {
          id: 'debt_amount_lock_schedule',
          amount: '20.00',
          dueDate: '2026-10-30',
        },
      ],
    });

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      code: 'DEBT_SCHEDULE_ITEM_AMOUNT_BELOW_PAID',
    });
    expect(await readDebtWithScheduleRows('debt_amount_lock')).toEqual(before);
  });

  it('allows increasing a paid schedule item without losing its payment history', async () => {
    const owner = await signUpOwner('debt-safe-payment-edit-owner@example.com');
    await insertCustomer(owner.ownerProfileId);
    await insertDebt({
      id: 'debt_safe_payment_edit',
      createdAt: '2026-09-10 10:00:00',
      totalAmount: '100.00',
    });
    await insertPayment({
      id: 'payment_safe_payment_edit',
      scheduleItemId: 'debt_safe_payment_edit_schedule',
      amount: '25.00',
      idempotencyKey: '00000000-0000-4000-8000-000000000025',
    });

    const response = await replaceDebtRequest(owner.cookieHeader, 'debt_safe_payment_edit', {
      expectedVersion: 1,
      description: 'Increased debt',
      totalAmount: '125.00',
      currency: 'USD',
      scheduleItems: [
        {
          id: 'debt_safe_payment_edit_schedule',
          amount: '125.00',
          dueDate: '2026-10-30',
        },
      ],
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      totalAmount: '125.00',
      paidAmount: '25.00',
      remainingAmount: '100.00',
      paymentCount: 1,
      scheduleItems: [
        {
          id: 'debt_safe_payment_edit_schedule',
          amount: '125.00',
          paidAmount: '25.00',
          remainingAmount: '100.00',
          paymentCount: 1,
        },
      ],
    });
  });
});
