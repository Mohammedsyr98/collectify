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

describe('debt replacement', () => {
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
    readScheduleItems,
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
        currency: 'USD',
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
        currency: 'USD',
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
      message: expect.any(String),
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
      message: expect.any(String),
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
});
