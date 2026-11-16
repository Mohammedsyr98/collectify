import { debtResponseSchema } from '@collectify/contracts';
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

describe('debt creation', () => {
  let postgres!: IntegrationDatabase;
  let backend!: IntegrationBackend;
  let ownerAuth!: ReturnType<typeof createOwnerAuthClient>;
  let context!: DebtTestContext;

  const {
    signUpOwner,
    insertCustomer,
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

  it('creates and persists an unpaid one-payment debt with one schedule item', async () => {
    const owner = await signUpOwner('debt-owner@example.com');
    await insertCustomer(owner.ownerProfileId);

    const createResponse = await fetch(
      `${backend!.baseUrl}/customers/customer_debt/debts`,
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
              dueDate: '2026-09-30',
            },
          ],
        }),
      },
    );

    expect(createResponse.status).toBe(201);
    const created = debtResponseSchema.parse(await createResponse.json());
    expect(created).toMatchObject({
      customerId: 'customer_debt',
      description: 'Website redesign',
      totalAmount: '125.50',
      currency: 'USD',
      paidAmount: '0.00',
      remainingAmount: '125.50',
      paymentState: 'unpaid',
      paymentCount: 0,
      paymentPlanType: 'onePayment',
      scheduleItems: [
        {
          position: 1,
          amount: '125.50',
          dueDate: '2026-09-30',
          paidAmount: '0.00',
          remainingAmount: '125.50',
          paymentState: 'unpaid',
          paymentCount: 0,
        },
      ],
    });

    const persistedRows = await readDebtWithScheduleRows(created.id);

    expect(persistedRows).toHaveLength(1);
    expect(persistedRows[0]).toMatchObject({
      debt_id: created.id,
      customer_id: 'customer_debt',
      description: 'Website redesign',
      debt_total_amount: '125.50',
      currency: 'USD',
      position: 1,
      schedule_amount: '125.50',
      schedule_due_date: '2026-09-30',
    });
  });

  it('creates and persists an installment debt with every schedule item', async () => {
    const owner = await signUpOwner('debt-installment-owner@example.com');
    await insertCustomer(owner.ownerProfileId);

    const createResponse = await fetch(
      `${backend!.baseUrl}/customers/customer_debt/debts`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          cookie: owner.cookieHeader,
        },
        body: JSON.stringify({
          description: 'Website redesign installments',
          totalAmount: '125.50',
          currency: 'USD',
          scheduleItems: [
            {
              amount: '60.00',
              dueDate: '2026-10-30',
            },
            {
              amount: '65.50',
              dueDate: '2026-11-30',
            },
          ],
        }),
      },
    );

    expect(createResponse.status).toBe(201);
    const created = debtResponseSchema.parse(await createResponse.json());
    expect(created).toMatchObject({
      customerId: 'customer_debt',
      description: 'Website redesign installments',
      totalAmount: '125.50',
      currency: 'USD',
      paymentPlanType: 'installment',
      scheduleItems: [
        {
          position: 1,
          amount: '60.00',
          dueDate: '2026-10-30',
        },
        {
          position: 2,
          amount: '65.50',
          dueDate: '2026-11-30',
        },
      ],
    });

    const persistedRows = await readDebtWithScheduleRows(created.id);

    expect(persistedRows).toHaveLength(2);
    expect(persistedRows).toEqual([
      expect.objectContaining({
        debt_id: created.id,
        customer_id: 'customer_debt',
        description: 'Website redesign installments',
        debt_total_amount: '125.50',
        currency: 'USD',
        position: 1,
        schedule_amount: '60.00',
        schedule_due_date: '2026-10-30',
      }),
      expect.objectContaining({
        debt_id: created.id,
        customer_id: 'customer_debt',
        description: 'Website redesign installments',
        debt_total_amount: '125.50',
        currency: 'USD',
        position: 2,
        schedule_amount: '65.50',
        schedule_due_date: '2026-11-30',
      }),
    ]);
  });

  it('exposes an invalid schedule-item due date through the creation endpoint validation response', async () => {
    const owner = await signUpOwner('debt-validation-owner@example.com');

    const response = await fetch(
      `${backend!.baseUrl}/customers/customer_debt/debts`,
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
              dueDate: 'not-a-date',
            },
          ],
        }),
      },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      code: 'VALIDATION_ERROR',
      message: 'Check the highlighted fields.',
      fieldErrors: {
        scheduleItems: ['Enter a valid due date.'],
      },
    });
  });

  it('rolls back the debt when schedule insertion fails', async () => {
    await postgres!.query(`
      CREATE FUNCTION fail_debt_schedule_insert()
      RETURNS trigger
      LANGUAGE plpgsql
      AS $$
      BEGIN
        IF NEW.amount = 999.99::numeric THEN
          RAISE EXCEPTION 'Injected schedule insert failure'
            USING ERRCODE = 'P0001';
        END IF;
        RETURN NEW;
      END;
      $$
    `);
    await postgres!.query(`
      CREATE TRIGGER debt_schedule_items_injected_failure
      BEFORE INSERT ON "debt_schedule_items"
      FOR EACH ROW
      EXECUTE FUNCTION fail_debt_schedule_insert()
    `);

    try {
      const owner = await signUpOwner('debt-rollback-owner@example.com');
      await insertCustomer(owner.ownerProfileId, {
        id: 'customer_rollback',
        code: 'DEBT-ROLLBACK',
      });

      const response = await fetch(
        `${backend!.baseUrl}/customers/customer_rollback/debts`,
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            cookie: owner.cookieHeader,
          },
          body: JSON.stringify({
            description: 'Injected failure debt',
            totalAmount: '999.99',
            currency: 'USD',
            scheduleItems: [
              {
                amount: '999.99',
                dueDate: '2026-09-30',
              },
            ],
          }),
        },
      );

      expect(response.status).toBe(500);

      const remainingDebts = await postgres!.query<{ count: number }>(
        'SELECT count(*)::int AS count FROM "debts" WHERE "customer_id" = $1',
        ['customer_rollback'],
      );
      const remainingScheduleItems = await postgres!.query<{ count: number }>(
        `
          SELECT count(*)::int AS count
          FROM "debt_schedule_items"
          JOIN "debts" ON "debts"."id" = "debt_schedule_items"."debt_id"
          WHERE "debts"."customer_id" = $1
        `,
        ['customer_rollback'],
      );

      expect(remainingDebts).toEqual([{ count: 0 }]);
      expect(remainingScheduleItems).toEqual([{ count: 0 }]);
    } finally {
      await postgres!.query(
        'DROP TRIGGER debt_schedule_items_injected_failure ON "debt_schedule_items"',
      );
      await postgres!.query('DROP FUNCTION fail_debt_schedule_insert()');
    }
  });
});
