import {
  debtListPageSize,
  debtListResponseSchema,
  debtResponseSchema,
} from '@collectify/contracts';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { getSetCookie, toCookieHeader } from '../test-support/http-cookies';
import {
  startIntegrationPostgres,
  type IntegrationBackend,
  type IntegrationPostgres,
} from '../test-support/integration-postgres';
import { createOwnerAuthClient } from '../test-support/owner-auth-client';
import { getIstanbulBusinessDate } from '../shared/istanbul-business-date';

type DebtWithScheduleRow = {
  debt_id: string;
  customer_id: string;
  description: string;
  debt_total_amount: string;
  debt_version: number | null;
  currency: string;
  debt_created_at: string;
  debt_updated_at: string;
  schedule_id: string;
  position: number;
  schedule_amount: string;
  schedule_due_date: string;
  schedule_created_at: string;
  schedule_updated_at: string;
};

type ScheduleItemRow = {
  id: string;
  position: number;
  amount: string;
  dueDate: string;
};

type DebtRouteOperation = (
  customerId: string,
  debtId: string,
) => Promise<Response>;

describe('debt routes', () => {
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

  it('creates a durable one-payment debt and retrieves it from the customer list', async () => {
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
      paymentPlanType: 'onePayment',
      scheduleItems: [
        {
          position: 1,
          amount: '125.50',
          dueDate: '2026-09-30',
        },
      ],
    });

    const listResponse = await fetch(
      `${backend!.baseUrl}/customers/customer_debt/debts`,
      {
        headers: {
          cookie: owner.cookieHeader,
        },
      },
    );

    expect(listResponse.status).toBe(200);
    const list = debtListResponseSchema.parse(await listResponse.json());
    expect(list).toMatchObject({
      items: [created],
      page: 1,
      pageSize: 5,
      totalItems: 1,
      totalPages: 1,
    });

    const scheduleRows = await postgres!.query<{
      debt_id: string;
      position: number;
      amount: string;
    }>(`
      SELECT "debt_id", "position", "amount"
      FROM "debt_schedule_items"
      WHERE "debt_id" = $1
    `, [created.id]);

    expect(scheduleRows).toEqual([
      {
        debt_id: created.id,
        position: 1,
        amount: '125.50',
      },
    ]);
  });

  it('creates and retrieves a durable installment debt with every schedule item', async () => {
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

    const listResponse = await fetch(
      `${backend!.baseUrl}/customers/customer_debt/debts`,
      {
        headers: {
          cookie: owner.cookieHeader,
        },
      },
    );

    expect(listResponse.status).toBe(200);
    const list = debtListResponseSchema.parse(await listResponse.json());
    expect(list.items).toEqual([created]);
  });

  it('replaces a durable one-payment debt while preserving its identities', async () => {
    const owner = await signUpOwner('debt-replace-owner@example.com');
    await insertCustomer(owner.ownerProfileId);
    const originalScheduleId = 'debt_replace_schedule';
    await insertDebt({
      id: 'debt_replace',
      createdAt: '2026-09-10 10:00:00',
      description: 'Original description',
      totalAmount: '125.50',
      scheduleItems: [
        {
          id: originalScheduleId,
          amount: '125.50',
          dueDate: '2026-09-30',
        },
      ],
    });

    const response = await replaceDebtRequest(owner.cookieHeader, 'debt_replace', {
      expectedVersion: 1,
      description: 'Updated description',
      totalAmount: '275.75',
      currency: 'EUR',
      scheduleItems: [
        {
          id: originalScheduleId,
          amount: '275.75',
          dueDate: '2026-09-01',
        },
      ],
    });

    expect(response.status).toBe(200);
    const replaced = debtResponseSchema.parse(await response.json());
    expect(replaced).toMatchObject({
      id: 'debt_replace',
      customerId: 'customer_debt',
      description: 'Updated description',
      totalAmount: '275.75',
      currency: 'EUR',
      paymentPlanType: 'onePayment',
      scheduleItems: [
        {
          id: originalScheduleId,
          position: 1,
          amount: '275.75',
          dueDate: '2026-09-01',
        },
      ],
    });

    expect(await readScheduleItems('debt_replace')).toEqual([
      {
        id: originalScheduleId,
        position: 1,
        amount: '275.75',
        dueDate: '2026-09-01',
      },
    ]);
  });

  it('reconciles retained, omitted, and new schedule rows in request order', async () => {
    const owner = await signUpOwner('debt-replace-schedule-owner@example.com');
    await insertCustomer(owner.ownerProfileId);
    const firstRetainedId = 'debt_replace_schedule_first';
    const secondRetainedId = 'debt_replace_schedule_second';
    const omittedId = 'debt_replace_schedule_omitted';
    const originalCreatedAt = '2026-09-10 10:00:00';
    const originalSchedule = [
      {
        id: firstRetainedId,
        amount: '40.00',
        dueDate: '2026-09-30',
      },
      {
        id: secondRetainedId,
        amount: '30.00',
        dueDate: '2026-10-30',
      },
      {
        id: omittedId,
        amount: '30.00',
        dueDate: '2026-11-30',
      },
    ];
    await insertDebt({
      id: 'debt_replace_schedule',
      createdAt: originalCreatedAt,
      description: 'Original schedule',
      totalAmount: '100.00',
      scheduleItems: originalSchedule,
    });

    const response = await replaceDebtRequest(owner.cookieHeader, 'debt_replace_schedule', {
      expectedVersion: 1,
      description: 'Updated schedule',
      totalAmount: '100.00',
      currency: 'EUR',
      scheduleItems: [
        {
          amount: '20.00',
          dueDate: '2026-11-30',
        },
        {
          id: firstRetainedId,
          amount: '40.00',
          dueDate: '2026-12-30',
        },
        {
          id: secondRetainedId,
          amount: '40.00',
          dueDate: '2027-01-30',
        },
      ],
    });

    expect(response.status).toBe(200);
    const replaced = debtResponseSchema.parse(await response.json());
    const generatedScheduleId = replaced.scheduleItems[0]!.id;
    expect(replaced).toMatchObject({
      id: 'debt_replace_schedule',
      totalAmount: '100.00',
      version: 2,
      paymentPlanType: 'installment',
      scheduleItems: [
        {
          position: 1,
          amount: '20.00',
          dueDate: '2026-11-30',
        },
        {
          id: firstRetainedId,
          position: 2,
          amount: '40.00',
          dueDate: '2026-12-30',
        },
        {
          id: secondRetainedId,
          position: 3,
          amount: '40.00',
          dueDate: '2027-01-30',
        },
      ],
    });

    const after = await readScheduleItems('debt_replace_schedule');
    expect(after).toEqual([
      {
        id: generatedScheduleId,
        position: 1,
        amount: '20.00',
        dueDate: '2026-11-30',
      },
      {
        id: firstRetainedId,
        position: 2,
        amount: '40.00',
        dueDate: '2026-12-30',
      },
      {
        id: secondRetainedId,
        position: 3,
        amount: '40.00',
        dueDate: '2027-01-30',
      },
    ]);
    expect(generatedScheduleId).not.toBe(firstRetainedId);
    expect(generatedScheduleId).not.toBe(secondRetainedId);
    expect(generatedScheduleId).not.toBe(omittedId);

    const afterRows = await readDebtWithScheduleRows('debt_replace_schedule');
    expect(afterRows).toHaveLength(3);
    expect(afterRows.map(({ debt_version }) => debt_version)).toEqual([2, 2, 2]);
    expect(afterRows[1]!.schedule_created_at).toBe(originalCreatedAt);
    expect(afterRows[2]!.schedule_created_at).toBe(originalCreatedAt);
    expect(afterRows[0]!.schedule_created_at).toBe(afterRows[0]!.schedule_updated_at);
    expect(new Set(afterRows.map(({ schedule_updated_at }) => schedule_updated_at))).toEqual(
      new Set([afterRows[0]!.debt_updated_at]),
    );
  });

  it('reorders retained schedule items according to request order', async () => {
    const owner = await signUpOwner('debt-reorder-owner@example.com');
    await insertCustomer(owner.ownerProfileId);
    const firstId = 'debt_reorder_first';
    const secondId = 'debt_reorder_second';
    const thirdId = 'debt_reorder_third';

    await insertDebt({
      id: 'debt_reorder',
      createdAt: '2026-09-10 10:00:00',
      totalAmount: '60.00',
      scheduleItems: [
        { id: firstId, amount: '10.00', dueDate: '2026-09-30' },
        { id: secondId, amount: '20.00', dueDate: '2026-10-30' },
        { id: thirdId, amount: '30.00', dueDate: '2026-11-30' },
      ],
    });

    const response = await replaceDebtRequest(owner.cookieHeader, 'debt_reorder', {
      expectedVersion: 1,
      description: 'Reordered schedule',
      totalAmount: '60.00',
      currency: 'USD',
      scheduleItems: [
        { id: thirdId, amount: '30.00', dueDate: '2026-09-30' },
        { id: firstId, amount: '10.00', dueDate: '2026-10-30' },
        { id: secondId, amount: '20.00', dueDate: '2026-11-30' },
      ],
    });

    expect(response.status).toBe(200);
    const replaced = debtResponseSchema.parse(await response.json());
    expect(replaced).toMatchObject({
      version: 2,
      paymentPlanType: 'installment',
      scheduleItems: [
        { id: thirdId, position: 1, amount: '30.00', dueDate: '2026-09-30' },
        { id: firstId, position: 2, amount: '10.00', dueDate: '2026-10-30' },
        { id: secondId, position: 3, amount: '20.00', dueDate: '2026-11-30' },
      ],
    });

    expect(await readScheduleItems('debt_reorder')).toEqual([
      {
        id: thirdId,
        position: 1,
        amount: '30.00',
        dueDate: '2026-09-30',
      },
      {
        id: firstId,
        position: 2,
        amount: '10.00',
        dueDate: '2026-10-30',
      },
      {
        id: secondId,
        position: 3,
        amount: '20.00',
        dueDate: '2026-11-30',
      },
    ]);
  });

  it('converts one payment to installments while retaining its schedule row identity', async () => {
    const owner = await signUpOwner('debt-replace-one-to-many-owner@example.com');
    await insertCustomer(owner.ownerProfileId);
    await insertDebt({
      id: 'debt_replace_one_to_many',
      createdAt: '2026-09-10 10:00:00',
      totalAmount: '100.00',
      scheduleItems: [
        {
          id: 'debt_replace_one_to_many_original',
          amount: '100.00',
          dueDate: '2026-09-30',
        },
      ],
    });

    const response = await replaceDebtRequest(owner.cookieHeader, 'debt_replace_one_to_many', {
      expectedVersion: 1,
      description: 'Split payment',
      totalAmount: '100.00',
      currency: 'USD',
      scheduleItems: [
        { amount: '40.00', dueDate: '2026-10-30' },
        {
          id: 'debt_replace_one_to_many_original',
          amount: '60.00',
          dueDate: '2026-11-30',
        },
      ],
    });

    expect(response.status).toBe(200);
    const replaced = debtResponseSchema.parse(await response.json());
    expect(replaced).toMatchObject({
      paymentPlanType: 'installment',
      version: 2,
      scheduleItems: [
        { position: 1, amount: '40.00', dueDate: '2026-10-30' },
        {
          id: 'debt_replace_one_to_many_original',
          position: 2,
          amount: '60.00',
          dueDate: '2026-11-30',
        },
      ],
    });

    const after = await readScheduleItems('debt_replace_one_to_many');
    const generatedScheduleId = replaced.scheduleItems[0]!.id;
    expect(after).toEqual([
      {
        id: generatedScheduleId,
        position: 1,
        amount: '40.00',
        dueDate: '2026-10-30',
      },
      {
        id: 'debt_replace_one_to_many_original',
        position: 2,
        amount: '60.00',
        dueDate: '2026-11-30',
      },
    ]);
    expect(generatedScheduleId).not.toBe('debt_replace_one_to_many_original');
  });

  it('converts installments to one payment while retaining the selected schedule row', async () => {
    const owner = await signUpOwner('debt-replace-many-to-one-owner@example.com');
    await insertCustomer(owner.ownerProfileId);
    await insertDebt({
      id: 'debt_replace_many_to_one',
      createdAt: '2026-09-10 10:00:00',
      totalAmount: '100.00',
      scheduleItems: [
        {
          id: 'debt_replace_many_to_one_omitted',
          amount: '40.00',
          dueDate: '2026-09-30',
        },
        {
          id: 'debt_replace_many_to_one_retained',
          amount: '60.00',
          dueDate: '2026-10-30',
        },
      ],
    });

    const response = await replaceDebtRequest(owner.cookieHeader, 'debt_replace_many_to_one', {
      expectedVersion: 1,
      description: 'Combined payment',
      totalAmount: '100.00',
      currency: 'USD',
      scheduleItems: [
        {
          id: 'debt_replace_many_to_one_retained',
          amount: '100.00',
          dueDate: '2026-12-30',
        },
      ],
    });

    expect(response.status).toBe(200);
    const replaced = debtResponseSchema.parse(await response.json());
    expect(replaced).toMatchObject({
      paymentPlanType: 'onePayment',
      version: 2,
      scheduleItems: [
        {
          id: 'debt_replace_many_to_one_retained',
          position: 1,
          amount: '100.00',
          dueDate: '2026-12-30',
        },
      ],
    });

    expect(await readScheduleItems('debt_replace_many_to_one')).toEqual([
      {
        id: 'debt_replace_many_to_one_retained',
        position: 1,
        amount: '100.00',
        dueDate: '2026-12-30',
      },
    ]);
  });

  it('increments the version for a value-equivalent one-payment replacement', async () => {
    const owner = await signUpOwner('debt-value-equivalent-owner@example.com');
    await insertCustomer(owner.ownerProfileId);
    await insertDebt({
      id: 'debt_value_equivalent',
      createdAt: '2026-09-10 10:00:00',
    });

    const before = await readDebtWithScheduleRows('debt_value_equivalent');
    const beforeRow = before[0]!;
    expect(beforeRow.debt_version).toBe(1);

    const unchangedRequest = {
      expectedVersion: 1,
      description: beforeRow.description,
      totalAmount: beforeRow.debt_total_amount,
      currency: beforeRow.currency,
      scheduleItems: [
        {
          id: beforeRow.schedule_id,
          amount: beforeRow.schedule_amount,
          dueDate: beforeRow.schedule_due_date,
        },
      ],
    };

    const response = await replaceDebtRequest(
      owner.cookieHeader,
      'debt_value_equivalent',
      unchangedRequest,
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      id: 'debt_value_equivalent',
      version: 2,
    });

    const after = await readDebtWithScheduleRows('debt_value_equivalent');
    expect(after[0]).toMatchObject({
      debt_version: 2,
      description: beforeRow.description,
      debt_total_amount: beforeRow.debt_total_amount,
      currency: beforeRow.currency,
      schedule_id: beforeRow.schedule_id,
      schedule_amount: beforeRow.schedule_amount,
      schedule_due_date: beforeRow.schedule_due_date,
    });
  });

  it('rejects a stale one-payment replacement without changing the complete debt', async () => {
    const owner = await signUpOwner('debt-stale-replacement-owner@example.com');
    await insertCustomer(owner.ownerProfileId);
    await insertDebt({
      id: 'debt_stale_replacement',
      createdAt: '2026-09-10 10:00:00',
      totalAmount: '125.50',
    });

    const currentReplacement = await replaceDebtRequest(owner.cookieHeader, 'debt_stale_replacement', {
      expectedVersion: 1,
      description: 'Current edit',
      totalAmount: '150.00',
      currency: 'EUR',
      scheduleItems: [
        {
          id: 'debt_stale_replacement_schedule',
          amount: '150.00',
          dueDate: '2026-10-01',
        },
      ],
    });

    expect(currentReplacement.status).toBe(200);
    await expect(currentReplacement.json()).resolves.toMatchObject({
      version: 2,
    });

    const beforeStaleReplacement = await readDebtWithScheduleRows(
      'debt_stale_replacement',
    );

    const staleReplacement = await replaceDebtRequest(owner.cookieHeader, 'debt_stale_replacement', {
      expectedVersion: 1,
      description: 'Stale edit must not win',
      totalAmount: '175.00',
      currency: 'USD',
      scheduleItems: [
        {
          id: 'debt_stale_replacement_schedule',
          amount: '175.00',
          dueDate: '2026-11-01',
        },
      ],
    });

    expect(staleReplacement.status).toBe(409);
    await expect(staleReplacement.json()).resolves.toEqual({
      code: 'DEBT_VERSION_CONFLICT',
      message: expect.any(String),
    });
    expect(await readDebtWithScheduleRows('debt_stale_replacement')).toEqual(
      beforeStaleReplacement,
    );
  });

  it('allows only one concurrent replacement for the same expected version', async () => {
    const owner = await signUpOwner('debt-concurrent-replacement-owner@example.com');
    await insertCustomer(owner.ownerProfileId);
    await insertDebt({
      id: 'debt_concurrent_replacement',
      createdAt: '2026-09-10 10:00:00',
    });

    const replacements = [
      {
        description: 'First concurrent edit',
        totalAmount: '150.00',
        currency: 'EUR',
        scheduleItems: [
          {
            id: 'debt_concurrent_replacement_schedule',
            amount: '150.00',
            dueDate: '2026-10-01',
          },
        ],
      },
      {
        description: 'Second concurrent edit',
        totalAmount: '175.00',
        currency: 'GBP',
        scheduleItems: [
          {
            id: 'debt_concurrent_replacement_schedule',
            amount: '175.00',
            dueDate: '2026-10-15',
          },
        ],
      },
    ];

    const responses = await Promise.all(
      replacements.map((replacement) =>
        replaceDebtRequest(owner.cookieHeader, 'debt_concurrent_replacement', {
          expectedVersion: 1,
          ...replacement,
        }),
      ),
    );

    expect(responses.map((response) => response.status).sort()).toEqual([200, 409]);

    const winningIndex = responses.findIndex((response) => response.status === 200);
    const losingIndex = responses.findIndex((response) => response.status === 409);
    expect(winningIndex).not.toBe(-1);
    expect(losingIndex).not.toBe(-1);
    await expect(responses[losingIndex]!.json()).resolves.toEqual({
      code: 'DEBT_VERSION_CONFLICT',
      message: 'The debt was changed by another request.',
    });

    const winningReplacement = replacements[winningIndex]!;
    await expect(responses[winningIndex]!.json()).resolves.toMatchObject({
      description: winningReplacement.description,
      totalAmount: winningReplacement.totalAmount,
      currency: winningReplacement.currency,
      version: 2,
      scheduleItems: [
        {
          id: 'debt_concurrent_replacement_schedule',
          position: 1,
          amount: winningReplacement.totalAmount,
          dueDate: winningReplacement.scheduleItems[0]!.dueDate,
        },
      ],
    });

    const persisted = await readDebtWithScheduleRows('debt_concurrent_replacement');
    expect(persisted).toHaveLength(1);
    expect(persisted[0]).toMatchObject({
      description: winningReplacement.description,
      debt_total_amount: winningReplacement.totalAmount,
      debt_version: 2,
      currency: winningReplacement.currency,
      schedule_id: 'debt_concurrent_replacement_schedule',
      position: 1,
      schedule_amount: winningReplacement.totalAmount,
      schedule_due_date: winningReplacement.scheduleItems[0]!.dueDate,
    });
  });

  it('returns a version conflict before validating an ID deleted by the winner', async () => {
    const owner = await signUpOwner('debt-stale-deleted-id-owner@example.com');
    await insertCustomer(owner.ownerProfileId);
    const retainedId = 'debt_stale_deleted_id_retained';
    const deletedId = 'debt_stale_deleted_id_deleted';
    await insertDebt({
      id: 'debt_stale_deleted_id',
      createdAt: '2026-09-10 10:00:00',
      totalAmount: '100.00',
      scheduleItems: [
        { id: retainedId, amount: '40.00', dueDate: '2026-09-30' },
        { id: deletedId, amount: '60.00', dueDate: '2026-10-30' },
      ],
    });

    const winner = await replaceDebtRequest(owner.cookieHeader, 'debt_stale_deleted_id', {
      expectedVersion: 1,
      description: 'Winner replacement',
      totalAmount: '100.00',
      currency: 'EUR',
      scheduleItems: [
        {
          id: retainedId,
          amount: '100.00',
          dueDate: '2026-11-30',
        },
      ],
    });

    expect(winner.status).toBe(200);

    const stale = await replaceDebtRequest(owner.cookieHeader, 'debt_stale_deleted_id', {
      expectedVersion: 1,
      description: 'Stale replacement',
      totalAmount: '100.00',
      currency: 'USD',
      scheduleItems: [
        {
          id: deletedId,
          amount: '100.00',
          dueDate: '2026-12-30',
        },
      ],
    });

    expect(stale.status).toBe(409);
    await expect(stale.json()).resolves.toEqual({
      code: 'DEBT_VERSION_CONFLICT',
      message: 'The debt was changed by another request.',
    });
  });

  it('serializes concurrent deletion and replacement of the same debt', async () => {
    const owner = await signUpOwner('debt-delete-replace-race-owner@example.com');
    await insertCustomer(owner.ownerProfileId);
    await insertDebt({
      id: 'debt_delete_replace_race',
      createdAt: '2026-09-10 10:00:00',
    });

    const [replacement, deletion] = await Promise.all([
      replaceDebtRequest(owner.cookieHeader, 'debt_delete_replace_race', {
        expectedVersion: 1,
        description: 'Racing replacement',
        totalAmount: '150.00',
        currency: 'EUR',
        scheduleItems: [
          {
            id: 'debt_delete_replace_race_schedule',
            amount: '150.00',
            dueDate: '2026-10-01',
          },
        ],
      }),
      fetch(
        `${backend!.baseUrl}/customers/customer_debt/debts/debt_delete_replace_race`,
        {
          method: 'DELETE',
          headers: { cookie: owner.cookieHeader },
        },
      ),
    ]);

    expect(deletion.status).toBe(204);
    expect([200, 404]).toContain(replacement.status);

    if (replacement.status === 200) {
      await expect(replacement.json()).resolves.toMatchObject({
        id: 'debt_delete_replace_race',
        version: 2,
        description: 'Racing replacement',
      });
    } else {
      await expect(replacement.json()).resolves.toEqual({
        code: 'DEBT_NOT_FOUND',
        message: 'Debt was not found.',
      });
    }

    expect(await readDebtWithScheduleRows('debt_delete_replace_race')).toEqual([]);
  });

  it('rejects a schedule identity that belongs to another debt', async () => {
    const owner = await signUpOwner('debt-schedule-identity-owner@example.com');
    await insertCustomer(owner.ownerProfileId);
    await insertDebt({
      id: 'debt_identity_target',
      createdAt: '2026-09-10 10:00:00',
    });
    await insertDebt({
      id: 'debt_identity_other',
      createdAt: '2026-09-10 10:00:00',
    });

    const before = await readDebtWithScheduleRows('debt_identity_target');
    const response = await replaceDebtRequest(owner.cookieHeader, 'debt_identity_target', {
      expectedVersion: 1,
      description: 'Should not be saved',
      totalAmount: '275.75',
      currency: 'EUR',
      scheduleItems: [
        {
          id: 'debt_identity_other_schedule',
          amount: '275.75',
          dueDate: '2026-09-01',
        },
      ],
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      code: 'DEBT_NOT_FOUND',
      message: 'Debt was not found.',
    });
    expect(await readDebtWithScheduleRows('debt_identity_target')).toEqual(
      before,
    );
  });

  it('rejects an unknown schedule identity without mutating the debt aggregate', async () => {
    const owner = await signUpOwner('debt-unknown-schedule-identity-owner@example.com');
    await insertCustomer(owner.ownerProfileId);
    await insertDebt({
      id: 'debt_unknown_schedule_identity',
      createdAt: '2026-09-10 10:00:00',
    });

    const before = await readDebtWithScheduleRows('debt_unknown_schedule_identity');
    const response = await replaceDebtRequest(
      owner.cookieHeader,
      'debt_unknown_schedule_identity',
      {
        expectedVersion: 1,
        description: 'Should not be saved',
        totalAmount: '275.75',
        currency: 'EUR',
        scheduleItems: [
          {
            id: 'schedule_does_not_exist',
            amount: '275.75',
            dueDate: '2026-10-01',
          },
        ],
      },
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      code: 'DEBT_NOT_FOUND',
      message: 'Debt was not found.',
    });
    expect(await readDebtWithScheduleRows('debt_unknown_schedule_identity')).toEqual(
      before,
    );
  });

  it('rejects duplicate schedule identities without mutating the debt aggregate', async () => {
    const owner = await signUpOwner('debt-duplicate-schedule-identity-owner@example.com');
    await insertCustomer(owner.ownerProfileId);
    await insertDebt({
      id: 'debt_duplicate_schedule_identity',
      createdAt: '2026-09-10 10:00:00',
      scheduleItems: [
        {
          id: 'debt_duplicate_schedule_identity_first',
          amount: '60.00',
          dueDate: '2026-09-30',
        },
        {
          id: 'debt_duplicate_schedule_identity_second',
          amount: '65.50',
          dueDate: '2026-10-30',
        },
      ],
    });

    const before = await readDebtWithScheduleRows('debt_duplicate_schedule_identity');
    const response = await replaceDebtRequest(
      owner.cookieHeader,
      'debt_duplicate_schedule_identity',
      {
        expectedVersion: 1,
        description: 'Should not be saved',
        totalAmount: '125.50',
        currency: 'USD',
        scheduleItems: [
          {
            id: 'debt_duplicate_schedule_identity_first',
            amount: '60.00',
            dueDate: '2026-09-30',
          },
          {
            id: 'debt_duplicate_schedule_identity_first',
            amount: '65.50',
            dueDate: '2026-10-30',
          },
        ],
      },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      code: 'VALIDATION_ERROR',
      message: 'Check the highlighted fields.',
      fieldErrors: {
        scheduleItems: ['Schedule items must use distinct saved IDs.'],
      },
    });
    expect(await readDebtWithScheduleRows('debt_duplicate_schedule_identity')).toEqual(
      before,
    );
  });

  it('generates a new schedule identity when replacement omits one', async () => {
    const owner = await signUpOwner('debt-schedule-new-identity-owner@example.com');
    await insertCustomer(owner.ownerProfileId);
    const originalScheduleId = 'debt_new_identity_schedule';
    await insertDebt({
      id: 'debt_new_identity',
      createdAt: '2026-09-10 10:00:00',
      scheduleItems: [
        {
          id: originalScheduleId,
          amount: '125.50',
          dueDate: '2026-09-30',
        },
      ],
    });

    const response = await replaceDebtRequest(owner.cookieHeader, 'debt_new_identity', {
      expectedVersion: 1,
      description: 'Replaced debt',
      totalAmount: '275.75',
      currency: 'EUR',
      scheduleItems: [
        {
          amount: '275.75',
          dueDate: '2026-09-01',
        },
      ],
    });

    expect(response.status).toBe(200);
    const replaced = debtResponseSchema.parse(await response.json());
    expect(replaced.scheduleItems[0]).toMatchObject({
      position: 1,
      amount: '275.75',
      dueDate: '2026-09-01',
    });
    expect(replaced.scheduleItems[0]!.id).not.toBe(originalScheduleId);

    expect(await readScheduleItems('debt_new_identity')).toEqual([
      {
        id: replaced.scheduleItems[0]!.id,
        position: 1,
        amount: '275.75',
        dueDate: '2026-09-01',
      },
    ]);
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

  it('does not reveal whether an inaccessible debt exists for replacement or deletion', async () => {
    const owner = await signUpOwner('debt-not-found-owner@example.com');
    await insertCustomer(owner.ownerProfileId, {
      id: 'customer_not_found_owner',
      code: 'DEBT-NOT-FOUND-OWNER',
    });
    await insertCustomer(owner.ownerProfileId, {
      id: 'customer_wrong_path',
      code: 'DEBT-WRONG-PATH',
    });
    await insertDebt({
      id: 'debt_lookup',
      customerId: 'customer_not_found_owner',
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

    const beforeOwnedDebt = await readDebtWithScheduleRows('debt_lookup');
    const beforeOtherOwnerDebt = await readDebtWithScheduleRows('debt_other_owner');
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
    const expectedNotFoundBody = JSON.stringify({
      code: 'DEBT_NOT_FOUND',
      message: 'Debt was not found.',
    });
    const replaceDebt: DebtRouteOperation = (customerId, debtId) =>
      replaceDebtRequest(owner.cookieHeader, debtId, requestBody, customerId);
    const deleteDebt: DebtRouteOperation = (customerId, debtId) =>
      fetch(
        `${backend!.baseUrl}/customers/${customerId}/debts/${debtId}`,
        {
          method: 'DELETE',
          headers: {
            cookie: owner.cookieHeader,
          },
        },
      );

    await expectInaccessibleDebtOperation(
      replaceDebt,
      expectedNotFoundBody,
      beforeOwnedDebt,
      beforeOtherOwnerDebt,
    );
    await expectInaccessibleDebtOperation(
      deleteDebt,
      expectedNotFoundBody,
      beforeOwnedDebt,
      beforeOtherOwnerDebt,
    );
  });

  it('rolls back the complete replacement after schedule mutation', async () => {
    await postgres!.query(`
      CREATE FUNCTION fail_debt_replacement_update()
      RETURNS trigger
      LANGUAGE plpgsql
      AS $$
      BEGIN
        RAISE EXCEPTION 'Injected debt replacement failure'
          USING ERRCODE = 'P0001';
      END;
      $$
    `);
    await postgres!.query(`
      CREATE TRIGGER debt_replacement_injected_update_failure
      AFTER UPDATE ON "debts"
      FOR EACH ROW
      EXECUTE FUNCTION fail_debt_replacement_update()
    `);

    try {
      const owner = await signUpOwner('debt-replacement-rollback-owner@example.com');
      await insertCustomer(owner.ownerProfileId, {
        id: 'customer_replacement_rollback',
        code: 'DEBT-REPLACEMENT-ROLLBACK',
      });
      await insertDebt({
        id: 'debt_replacement_rollback',
        customerId: 'customer_replacement_rollback',
        createdAt: '2026-09-10 10:00:00',
      });

      const before = await readDebtWithScheduleRows('debt_replacement_rollback');
      const response = await replaceDebtRequest(
        owner.cookieHeader,
        'debt_replacement_rollback',
        {
          expectedVersion: 1,
          description: 'Should be rolled back',
          totalAmount: '999.99',
          currency: 'EUR',
          scheduleItems: [
            {
              id: 'debt_replacement_rollback_schedule',
              amount: '999.99',
              dueDate: '2026-10-01',
            },
          ],
        },
        'customer_replacement_rollback',
      );

      expect(response.status).toBe(500);
      expect(await readDebtWithScheduleRows('debt_replacement_rollback')).toEqual(
        before,
      );
    } finally {
      await postgres!.query(
        'DROP TRIGGER debt_replacement_injected_update_failure ON "debts"',
      );
      await postgres!.query('DROP FUNCTION fail_debt_replacement_update()');
    }
  });

  it('returns human-readable validation messages for invalid debt input', async () => {
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

  it('orders debt pages by collection priority with deterministic tie-breakers', async () => {
    const owner = await signUpOwner('debt-priority-owner@example.com');
    await insertCustomer(owner.ownerProfileId);
    const businessDate = getIstanbulBusinessDate(new Date());

    await insertDebt({
      id: 'debt_priority_overdue_earliest',
      createdAt: '2026-09-01 10:00:00',
      dueDate: '1900-01-01',
    });
    await insertDebt({
      id: 'debt_priority_overdue_tie_a',
      createdAt: '2026-09-02 10:00:00',
      dueDate: '1900-01-02',
    });
    await insertDebt({
      id: 'debt_priority_overdue_tie_b',
      createdAt: '2026-09-02 10:00:00',
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
      'debt_priority_overdue_earliest',
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

  function replaceDebtRequest(
    cookieHeader: string,
    debtId: string,
    body: unknown,
    customerId = 'customer_debt',
  ) {
    return fetch(
      `${backend!.baseUrl}/customers/${customerId}/debts/${debtId}`,
      {
        method: 'PUT',
        headers: {
          'content-type': 'application/json',
          cookie: cookieHeader,
        },
        body: JSON.stringify(body),
      },
    );
  }

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

  it('returns the same not-found response for missing and non-owned customers', async () => {
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

  it('does not expose one owner’s debts to another owner', async () => {
    const firstOwner = await signUpOwner('debt-isolation-first@example.com');
    const secondOwner = await signUpOwner('debt-isolation-second@example.com');
    await insertCustomer(firstOwner.ownerProfileId, {
      id: 'customer_isolation_first',
      code: 'DEBT-FIRST',
    });
    await insertCustomer(secondOwner.ownerProfileId, {
      id: 'customer_isolation_second',
      code: 'DEBT-SECOND',
    });
    await insertDebt({
      id: 'debt_isolation_first',
      customerId: 'customer_isolation_first',
      createdAt: '2026-09-05 10:00:00',
    });

    const firstOwnerResponse = await fetch(
      `${backend!.baseUrl}/customers/customer_isolation_first/debts`,
      {
        headers: {
          cookie: firstOwner.cookieHeader,
        },
      },
    );
    const secondOwnerResponse = await fetch(
      `${backend!.baseUrl}/customers/customer_isolation_first/debts`,
      {
        headers: {
          cookie: secondOwner.cookieHeader,
        },
      },
    );

    expect(firstOwnerResponse.status).toBe(200);
    expect(
      debtListResponseSchema.parse(await firstOwnerResponse.json()).items.map(
        (debt) => debt.id,
      ),
    ).toEqual(['debt_isolation_first']);
    expect(secondOwnerResponse.status).toBe(404);
    await expect(secondOwnerResponse.json()).resolves.toEqual({
      code: 'CUSTOMER_NOT_FOUND',
      message: 'Customer was not found.',
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

  function readDebtWithScheduleRows(
    debtId: string,
  ): Promise<DebtWithScheduleRow[]> {
    return postgres!.query<DebtWithScheduleRow>(`
      SELECT
        d."id" AS "debt_id",
        d."customer_id",
        d."description",
        d."total_amount"::text AS "debt_total_amount",
        d."version" AS "debt_version",
        d."currency",
        d."created_at"::text AS "debt_created_at",
        d."updated_at"::text AS "debt_updated_at",
        s."id" AS "schedule_id",
        s."position",
        s."amount"::text AS "schedule_amount",
        s."due_date"::text AS "schedule_due_date",
        s."created_at"::text AS "schedule_created_at",
        s."updated_at"::text AS "schedule_updated_at"
      FROM "debts" d
      JOIN "debt_schedule_items" s ON s."debt_id" = d."id"
      WHERE d."id" = $1
      ORDER BY s."position"
    `, [debtId]);
  }

  function readScheduleItems(debtId: string): Promise<ScheduleItemRow[]> {
    return postgres!.query<ScheduleItemRow>(`
      SELECT
        s."id" AS "id",
        s."position" AS "position",
        s."amount"::text AS "amount",
        s."due_date"::text AS "dueDate"
      FROM "debt_schedule_items" s
      WHERE s."debt_id" = $1
      ORDER BY s."position"
    `, [debtId]);
  }

  async function expectInaccessibleDebtOperation(
    operation: DebtRouteOperation,
    expectedNotFoundBody: string,
    beforeOwnedDebt: DebtWithScheduleRow[],
    beforeOtherOwnerDebt: DebtWithScheduleRow[],
  ): Promise<void> {
    const requests = [
      {
        customerId: 'customer_not_found_owner',
        debtId: 'debt_missing',
      },
      {
        customerId: 'customer_wrong_path',
        debtId: 'debt_lookup',
      },
      {
        customerId: 'customer_other_owner',
        debtId: 'debt_other_owner',
      },
    ];
    const responses = await Promise.all(
      requests.map(({ customerId, debtId }) => operation(customerId, debtId)),
    );

    expect(responses.map((response) => response.status)).toEqual([404, 404, 404]);
    const responseBodies = await Promise.all(
      responses.map((response) => response.text()),
    );
    expect(new Set(responseBodies)).toEqual(new Set([expectedNotFoundBody]));

    expect(await readDebtWithScheduleRows('debt_lookup')).toEqual(beforeOwnedDebt);
    expect(await readDebtWithScheduleRows('debt_other_owner')).toEqual(
      beforeOtherOwnerDebt,
    );
  }

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

  function insertCustomer(
    ownerProfileId: string,
    {
      code = 'DEBT-001',
      id = 'customer_debt',
    }: { code?: string; id?: string } = {},
  ): Promise<unknown[]> {
    return postgres!.query(
      `
        INSERT INTO "customers" (
          "id",
          "owner_profile_id",
          "name",
          "code",
          "phone_number",
          "created_at",
          "updated_at"
        )
        VALUES ($1, $2, $3, $4, $5, now(), now())
      `,
      [id, ownerProfileId, 'Debt Customer', code, '+90 555 123 45 67'],
    );
  }

  async function insertDebt({
    customerId = 'customer_debt',
    createdAt,
    currency = 'USD',
    dueDate = '2026-09-30',
    id,
    description = 'Page debt',
    totalAmount = '125.50',
    scheduleItems = [
      {
        id: `${id}_schedule`,
        amount: totalAmount,
        dueDate,
      },
    ],
  }: {
    customerId?: string;
    createdAt: string;
    currency?: string;
    dueDate?: string;
    description?: string;
    id: string;
    totalAmount?: string;
    scheduleItems?: Array<{
      id: string;
      amount: string;
      dueDate: string;
    }>;
  }): Promise<void> {
    await postgres!.query(
      `
        INSERT INTO "debts" (
          "id",
          "customer_id",
          "description",
          "total_amount",
          "currency",
          "created_at",
          "updated_at"
        )
        VALUES ($1, $2, $3, $4, $5, $6::timestamp, $6::timestamp)
      `,
      [id, customerId, description, totalAmount, currency, createdAt],
    );

    for (const [index, scheduleItem] of scheduleItems.entries()) {
      await postgres!.query(
        `
          INSERT INTO "debt_schedule_items" (
            "id",
            "debt_id",
            "position",
            "amount",
            "due_date",
            "created_at",
            "updated_at"
          )
          VALUES ($1, $2, $3, $4, $5::date, $6::timestamp, $6::timestamp)
        `,
        [
          scheduleItem.id,
          id,
          index + 1,
          scheduleItem.amount,
          scheduleItem.dueDate,
          createdAt,
        ],
      );
    }
  }
});
