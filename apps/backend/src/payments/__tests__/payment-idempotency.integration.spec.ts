import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

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

describe('payment idempotency routes', () => {
  let postgres!: IntegrationDatabase;
  let backend!: IntegrationBackend;
  let ownerAuth!: ReturnType<typeof createOwnerAuthClient>;
  let context!: PaymentTestContext;

  const {
    setupSingleSchedulePaymentScenario,
    recordPayment,
    countPayments,
    readDebtVersion,
  } = createPaymentTestHelpers(() => context);

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

  it('replays an identical request without applying it twice', async () => {
    const { owner, customerId, debtId, scheduleItemId } = await setupSingleSchedulePaymentScenario({
      ownerEmail: 'payment-idempotency-owner@example.com',
      customerId: 'customer_payment_idempotency',
      debtId: 'payment_idempotency_debt',
      debt: { totalAmount: '100.00', version: 1 },
    });

    const request = makePaymentRequest(scheduleItemId, 17, {
      amount: '25.20',
      expectedDebtVersion: 1,
      note: null,
    });
    const firstResponse = await recordPayment(
      owner.cookieHeader,
      customerId,
      request,
    );
    expect(firstResponse.status).toBe(201);
    const firstBody = await firstResponse.json();

    const replayResponse = await recordPayment(
      owner.cookieHeader,
      customerId,
      request,
    );

    expect(replayResponse.status).toBe(201);
    const replayBody = await replayResponse.json();
    expect(replayBody).toEqual(firstBody);
    expect(await countPayments(scheduleItemId)).toBe(1);
    expect(await readDebtVersion(debtId)).toBe(2);
  });

  it('treats canonically equivalent requests as the same idempotent operation', async () => {
    const { owner, customerId, debtId, scheduleItemId } = await setupSingleSchedulePaymentScenario({
      ownerEmail: 'payment-canonical-idempotency-owner@example.com',
      customerId: 'customer_payment_canonical_idempotency',
      debtId: 'payment_canonical_idempotency_debt',
      debt: { totalAmount: '100.00', version: 1 },
    });

    const firstResponse = await recordPayment(
      owner.cookieHeader,
      customerId,
      makePaymentRequest(scheduleItemId, 18, {
        amount: '25.2',
        expectedDebtVersion: 1,
        note: ' ',
      }),
    );
    expect(firstResponse.status).toBe(201);
    const firstBody = await firstResponse.json();

    const replayResponse = await recordPayment(
      owner.cookieHeader,
      customerId,
      makePaymentRequest(scheduleItemId, 18, {
        amount: '25.20',
        expectedDebtVersion: 1,
        note: null,
      }),
    );

    expect(replayResponse.status).toBe(201);
    const replayBody = await replayResponse.json();
    expect(replayBody).toEqual(firstBody);
    expect(await countPayments(scheduleItemId)).toBe(1);
    expect(await readDebtVersion(debtId)).toBe(2);
  });

  it('rejects reusing an idempotency key for a different normalized request', async () => {
    const { owner, customerId, debtId, scheduleItemId } = await setupSingleSchedulePaymentScenario({
      ownerEmail: 'payment-key-reuse-owner@example.com',
      customerId: 'customer_payment_key_reuse',
      debtId: 'payment_key_reuse_debt',
      debt: { totalAmount: '100.00', version: 1 },
    });

    const firstResponse = await recordPayment(
      owner.cookieHeader,
      customerId,
      makePaymentRequest(scheduleItemId, 19, {
        amount: '10.00',
        expectedDebtVersion: 1,
      }),
    );
    expect(firstResponse.status).toBe(201);

    const reusedResponse = await recordPayment(
      owner.cookieHeader,
      customerId,
      makePaymentRequest(scheduleItemId, 19, {
        amount: '20.00',
        expectedDebtVersion: 1,
      }),
    );

    expect(reusedResponse.status).toBe(409);
    await expect(reusedResponse.json()).resolves.toMatchObject({
      code: 'PAYMENT_IDEMPOTENCY_KEY_REUSED',
    });
    expect(await countPayments(scheduleItemId)).toBe(1);
    expect(await readDebtVersion(debtId)).toBe(2);
  });
});
