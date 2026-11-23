import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import {
  replacePaymentResponseSchema,
  type RecordPaymentResponse,
} from '@collectify/contracts';

import {
  createIntegrationDatabase,
  startIntegrationBackend,
  type IntegrationBackend,
  type IntegrationDatabase,
} from '../../test-support/integration-test-support';
import { createOwnerAuthClient } from '../../test-support/owner-auth-client';
import {
  createPaymentTestHelpers,
  makePaymentRequest,
  type PaymentTestContext,
} from './payment-integration-test-support';

describe('payment replacement route', () => {
  let database!: IntegrationDatabase;
  let backend!: IntegrationBackend;
  let ownerAuth!: ReturnType<typeof createOwnerAuthClient>;
  let context!: PaymentTestContext;

  beforeAll(async () => {
    database = createIntegrationDatabase();
    backend = await startIntegrationBackend();
    ownerAuth = createOwnerAuthClient(backend.baseUrl);
    context = { database, backend, ownerAuth };
  });

  beforeEach(async () => {
    await database.reset();
  });

  afterAll(async () => {
    await backend.app.close();
  });

  it('updates the existing payment while preserving its target and identity', async () => {
    const helpers = createPaymentTestHelpers(() => context);
    const { owner, customerId, debtId, scheduleItemId } =
      await helpers.setupSingleSchedulePaymentScenario({
        ownerEmail: 'payment-replacement-owner@example.com',
        customerId: 'customer_payment_replacement',
        debtId: 'payment_replacement_debt',
        debt: { totalAmount: '100.00', version: 1 },
      });

    const recordedResponse = await helpers.recordPayment(
      owner.cookieHeader,
      customerId,
      makePaymentRequest(scheduleItemId, 31, {
        amount: '20.00',
        note: 'original note',
      }),
    );
    expect(recordedResponse.status).toBe(201);
    const recorded = (await recordedResponse.json()) as RecordPaymentResponse;
    const paymentId = recorded.payment.id;

    const replacementResponse = await fetch(
      `${backend.baseUrl}/customers/${customerId}/payments/${paymentId}`,
      {
        method: 'PUT',
        headers: {
          'content-type': 'application/json',
          cookie: owner.cookieHeader,
        },
        body: JSON.stringify({
          amount: '35.00',
          paymentDate: '2026-10-21',
          note: 'corrected note',
          expectedSourceDebtVersion: 2,
        }),
      },
    );

    expect(replacementResponse.status).toBe(200);
    const replaced = replacePaymentResponseSchema.parse(await replacementResponse.json());
    expect(replaced).toMatchObject({
      payment: {
        id: paymentId,
        scheduleItemId,
        amount: '35.00',
        paymentDate: '2026-10-21',
        note: 'corrected note',
        idempotencyKey: makePaymentRequest(scheduleItemId, 31).idempotencyKey,
        createdAt: recorded.payment.createdAt,
      },
    });
    expect(replaced.payment.updatedAt).not.toBe(recorded.payment.updatedAt);
    expect(await helpers.readPayments(scheduleItemId)).toHaveLength(1);
    expect(await helpers.readDebtVersion(debtId)).toBe(3);
  });

  it('derives capacity without counting the saved payment and permits editing a fully paid target', async () => {
    const helpers = createPaymentTestHelpers(() => context);
    const { owner, customerId, debtId, scheduleItemId } =
      await helpers.setupSingleSchedulePaymentScenario({
        ownerEmail: 'payment-replacement-capacity-owner@example.com',
        customerId: 'customer_payment_replacement_capacity',
        debtId: 'payment_replacement_capacity_debt',
        debt: { totalAmount: '100.00', version: 1 },
      });

    const firstResponse = await helpers.recordPayment(
      owner.cookieHeader,
      customerId,
      makePaymentRequest(scheduleItemId, 32, { amount: '20.00' }),
    );
    const first = (await firstResponse.json()) as RecordPaymentResponse;
    const secondResponse = await helpers.recordPayment(
      owner.cookieHeader,
      customerId,
      makePaymentRequest(scheduleItemId, 33, {
        amount: '30.00',
        expectedDebtVersion: 2,
      }),
    );
    expect(secondResponse.status).toBe(201);

    const exactCapacityResponse = await helpers.replacePayment(
      owner.cookieHeader,
      customerId,
      first.payment.id,
      {
        amount: '70.00',
        paymentDate: '2026-10-22',
        note: null,
        expectedSourceDebtVersion: 3,
      },
    );
    expect(exactCapacityResponse.status).toBe(200);
    expect(await helpers.readDebtVersion(debtId)).toBe(4);

    const overCapacityResponse = await helpers.replacePayment(
      owner.cookieHeader,
      customerId,
      first.payment.id,
      {
        amount: '70.01',
        paymentDate: '2026-10-22',
        note: null,
        expectedSourceDebtVersion: 4,
      },
    );
    expect(overCapacityResponse.status).toBe(409);
    await expect(overCapacityResponse.json()).resolves.toMatchObject({
      code: 'PAYMENT_AMOUNT_EXCEEDS_REMAINING',
    });

    const fullyPaidReplacement = await helpers.replacePayment(
      owner.cookieHeader,
      customerId,
      first.payment.id,
      {
        amount: '60.00',
        paymentDate: '2026-10-22',
        note: null,
        expectedSourceDebtVersion: 4,
      },
    );
    expect(fullyPaidReplacement.status).toBe(200);
    expect(await helpers.readDebtVersion(debtId)).toBe(5);
  });

  it('rejects stale snapshots without changing the payment', async () => {
    const helpers = createPaymentTestHelpers(() => context);
    const { owner, customerId, debtId, scheduleItemId } =
      await helpers.setupSingleSchedulePaymentScenario({
        ownerEmail: 'payment-replacement-stale-owner@example.com',
        customerId: 'customer_payment_replacement_stale',
        debtId: 'payment_replacement_stale_debt',
      });
    const recordedResponse = await helpers.recordPayment(
      owner.cookieHeader,
      customerId,
      makePaymentRequest(scheduleItemId, 34),
    );
    const recorded = (await recordedResponse.json()) as RecordPaymentResponse;

    const response = await helpers.replacePayment(
      owner.cookieHeader,
      customerId,
      recorded.payment.id,
      {
        amount: '12.00',
        paymentDate: '2026-10-22',
        note: 'stale',
        expectedSourceDebtVersion: 1,
      },
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      code: 'PAYMENT_DEBT_VERSION_CONFLICT',
    });
    expect(await helpers.readPayments(scheduleItemId)).toMatchObject([
      { amount: '10.00', note: null },
    ]);
    expect(await helpers.readDebtVersion(debtId)).toBe(2);
  });

  it('invalidates an edit snapshot when another installment changes', async () => {
    const helpers = createPaymentTestHelpers(() => context);
    const owner = await helpers.signUpOwner('payment-replacement-installment-owner@example.com');
    const customerId = 'customer_payment_replacement_installment';
    const debtId = 'payment_replacement_installment_debt';
    await helpers.insertCustomer(owner.ownerProfileId, { id: customerId });
    await helpers.insertDebt({
      id: debtId,
      customerId,
      totalAmount: '100.00',
      scheduleItems: [
        { id: 'payment_replacement_installment_first', amount: '60.00', dueDate: '2026-10-30' },
        { id: 'payment_replacement_installment_second', amount: '40.00', dueDate: '2026-11-30' },
      ],
    });

    const firstResponse = await helpers.recordPayment(
      owner.cookieHeader,
      customerId,
      makePaymentRequest('payment_replacement_installment_first', 36, { amount: '20.00' }),
    );
    const first = (await firstResponse.json()) as RecordPaymentResponse;
    const secondResponse = await helpers.recordPayment(
      owner.cookieHeader,
      customerId,
      makePaymentRequest('payment_replacement_installment_second', 37, {
        amount: '10.00',
        expectedDebtVersion: 2,
      }),
    );
    expect(secondResponse.status).toBe(201);

    const response = await helpers.replacePayment(
      owner.cookieHeader,
      customerId,
      first.payment.id,
      {
        amount: '25.00',
        paymentDate: '2026-10-22',
        note: null,
        expectedSourceDebtVersion: 2,
      },
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      code: 'PAYMENT_DEBT_VERSION_CONFLICT',
    });
  });

  it('serializes concurrent replacements so only one can use the same debt snapshot', async () => {
    const helpers = createPaymentTestHelpers(() => context);
    const { owner, customerId, debtId, scheduleItemId } =
      await helpers.setupSingleSchedulePaymentScenario({
        ownerEmail: 'payment-replacement-concurrency-owner@example.com',
        customerId: 'customer_payment_replacement_concurrency',
        debtId: 'payment_replacement_concurrency_debt',
      });
    const recordedResponse = await helpers.recordPayment(
      owner.cookieHeader,
      customerId,
      makePaymentRequest(scheduleItemId, 38),
    );
    const recorded = (await recordedResponse.json()) as RecordPaymentResponse;

    const responses = await Promise.all([
      helpers.replacePayment(owner.cookieHeader, customerId, recorded.payment.id, {
        amount: '20.00',
        paymentDate: '2026-10-22',
        note: 'first correction',
        expectedSourceDebtVersion: 2,
      }),
      helpers.replacePayment(owner.cookieHeader, customerId, recorded.payment.id, {
        amount: '30.00',
        paymentDate: '2026-10-22',
        note: 'second correction',
        expectedSourceDebtVersion: 2,
      }),
    ]);

    expect(responses.map((response) => response.status).sort()).toEqual([200, 409]);
    expect(await helpers.readDebtVersion(debtId)).toBe(3);
    expect(await helpers.countPayments(scheduleItemId)).toBe(1);
  });

  it('rolls back the payment update when the debt version increment fails', async () => {
    const maximumIntegerVersion = 2_147_483_647;
    const helpers = createPaymentTestHelpers(() => context);
    const { owner, customerId, debtId, scheduleItemId } =
      await helpers.setupSingleSchedulePaymentScenario({
        ownerEmail: 'payment-replacement-rollback-owner@example.com',
        customerId: 'customer_payment_replacement_rollback',
        debtId: 'payment_replacement_rollback_debt',
        debt: { version: maximumIntegerVersion },
      });
    const paymentId = 'payment_replacement_rollback';
    await database.query(
      `
        INSERT INTO "payments" (
          "id", "schedule_item_id", "amount", "payment_date", "note",
          "idempotency_key", "request_fingerprint", "created_at", "updated_at"
        )
        VALUES ($1, $2, '10.00', '2026-10-20'::date, NULL, $3::uuid, $1, now(), now())
      `,
      [paymentId, scheduleItemId, '10000000-0000-4000-8000-000000000039'],
    );

    const response = await helpers.replacePayment(
      owner.cookieHeader,
      customerId,
      paymentId,
      {
        amount: '20.00',
        paymentDate: '2026-10-22',
        note: 'should roll back',
        expectedSourceDebtVersion: maximumIntegerVersion,
      },
    );

    expect(response.status).toBe(500);
    expect(await helpers.readPayments(scheduleItemId)).toMatchObject([
      { id: paymentId, amount: '10.00', note: null },
    ]);
    expect(await helpers.readDebtVersion(debtId)).toBe(maximumIntegerVersion);
  });

  it('uses the same not-found response for missing and unauthorized payment IDs', async () => {
    const helpers = createPaymentTestHelpers(() => context);
    const customerOwner = await helpers.setupSingleSchedulePaymentScenario({
      ownerEmail: 'payment-replacement-private-owner@example.com',
      customerId: 'customer_payment_replacement_private',
      debtId: 'payment_replacement_private_debt',
    });
    const otherOwner = await helpers.signUpOwner('payment-replacement-other-owner@example.com');

    const recordedResponse = await helpers.recordPayment(
      customerOwner.owner.cookieHeader,
      customerOwner.customerId,
      makePaymentRequest(customerOwner.scheduleItemId, 35),
    );
    const recorded = (await recordedResponse.json()) as RecordPaymentResponse;
    const request = {
      amount: '12.00',
      paymentDate: '2026-10-22',
      note: null,
      expectedSourceDebtVersion: 2,
    };

    const wrongOwnerResponse = await helpers.replacePayment(
      otherOwner.cookieHeader,
      customerOwner.customerId,
      recorded.payment.id,
      request,
    );
    const sameOwnerOtherCustomerId = 'customer_payment_replacement_other_customer';
    await helpers.insertCustomer(customerOwner.owner.ownerProfileId, {
      id: sameOwnerOtherCustomerId,
    });
    const wrongCustomerResponse = await helpers.replacePayment(
      customerOwner.owner.cookieHeader,
      sameOwnerOtherCustomerId,
      recorded.payment.id,
      request,
    );
    const missingResponse = await helpers.replacePayment(
      customerOwner.owner.cookieHeader,
      customerOwner.customerId,
      'missing_payment',
      request,
    );

    expect(wrongOwnerResponse.status).toBe(404);
    expect(wrongCustomerResponse.status).toBe(404);
    expect(missingResponse.status).toBe(404);
    await expect(wrongOwnerResponse.json()).resolves.toEqual(
      expect.objectContaining({ code: 'PAYMENT_NOT_FOUND' }),
    );
    await expect(wrongCustomerResponse.json()).resolves.toEqual(
      expect.objectContaining({ code: 'PAYMENT_NOT_FOUND' }),
    );
    await expect(missingResponse.json()).resolves.toEqual(
      expect.objectContaining({ code: 'PAYMENT_NOT_FOUND' }),
    );
    expect(await helpers.readPayments(customerOwner.scheduleItemId)).toMatchObject([
      { id: recorded.payment.id, amount: '10.00', note: null },
    ]);
    expect(await helpers.readDebtVersion(customerOwner.debtId)).toBe(2);
  });
});
