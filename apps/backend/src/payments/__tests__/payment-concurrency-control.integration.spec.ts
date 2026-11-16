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

describe('payment concurrency control', () => {
  let postgres!: IntegrationDatabase;
  let backend!: IntegrationBackend;
  let ownerAuth!: ReturnType<typeof createOwnerAuthClient>;
  let context!: PaymentTestContext;

  const {
    setupSingleSchedulePaymentScenario,
    signUpOwner,
    insertCustomer,
    insertDebt,
    recordPayment,
    countPayments,
    readPaymentAmount,
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

  it('rejects a payment when the expected debt version is stale', async () => {
    const { owner, customerId, debtId, scheduleItemId } = await setupSingleSchedulePaymentScenario({
      ownerEmail: 'payment-version-owner@example.com',
      customerId: 'customer_payment_version',
      debtId: 'payment_version_debt',
      debt: { totalAmount: '100.00', version: 1 },
    });

    const firstResponse = await recordPayment(
      owner.cookieHeader,
      customerId,
      makePaymentRequest(scheduleItemId, 15, {
        expectedDebtVersion: 1,
      }),
    );
    expect(firstResponse.status).toBe(201);

    const staleResponse = await recordPayment(
      owner.cookieHeader,
      customerId,
      makePaymentRequest(scheduleItemId, 16, {
        amount: '20.00',
        expectedDebtVersion: 1,
      }),
    );

    expect(staleResponse.status).toBe(409);
    await expect(staleResponse.json()).resolves.toMatchObject({
      code: 'PAYMENT_DEBT_VERSION_CONFLICT',
    });
    expect(await countPayments(scheduleItemId)).toBe(1);
    expect(await readDebtVersion(debtId)).toBe(2);
  });

  it("allows only one of two concurrent payments that would collectively exceed the schedule item's amount", async () => {
    const { owner, customerId, debtId, scheduleItemId } = await setupSingleSchedulePaymentScenario({
      ownerEmail: 'payment-concurrency-owner@example.com',
      customerId: 'customer_payment_concurrency',
      debtId: 'payment_concurrency_debt',
      debt: { totalAmount: '100.00', version: 1 },
    });

    const responses = await Promise.all([
      recordPayment(
        owner.cookieHeader,
        customerId,
        makePaymentRequest(scheduleItemId, 19, {
          amount: '60.00',
          expectedDebtVersion: 1,
        }),
      ),
      recordPayment(
        owner.cookieHeader,
        customerId,
        makePaymentRequest(scheduleItemId, 20, {
          amount: '60.00',
          expectedDebtVersion: 1,
        }),
      ),
    ]);

    expect(responses.map((response) => response.status).sort()).toEqual([
      201,
      409,
    ]);
    expect(await countPayments(scheduleItemId)).toBe(1);
    expect(await readPaymentAmount(scheduleItemId)).toBe('60.00');
    expect(await readDebtVersion(debtId)).toBe(2);
  });

  it('allows only one concurrent payment across schedule items when both expect the same debt version', async () => {
    const owner = await signUpOwner('payment-different-targets-owner@example.com');
    await insertCustomer(owner.ownerProfileId, {
      id: 'customer_payment_different_targets',
    });
    await insertDebt({
      id: 'payment_different_targets_debt',
      customerId: 'customer_payment_different_targets',
      totalAmount: '100.00',
      version: 1,
      scheduleItems: [
        {
          id: 'payment_different_targets_first',
          amount: '60.00',
          dueDate: '2026-10-30',
        },
        {
          id: 'payment_different_targets_second',
          amount: '40.00',
          dueDate: '2026-11-30',
        },
      ],
    });

    const responses = await Promise.all([
      recordPayment(
        owner.cookieHeader,
        'customer_payment_different_targets',
        makePaymentRequest('payment_different_targets_first', 21, {
          amount: '10.00',
          expectedDebtVersion: 1,
        }),
      ),
      recordPayment(
        owner.cookieHeader,
        'customer_payment_different_targets',
        makePaymentRequest('payment_different_targets_second', 22, {
          amount: '10.00',
          expectedDebtVersion: 1,
        }),
      ),
    ]);

    const targetPaymentCounts = await Promise.all([
      countPayments('payment_different_targets_first'),
      countPayments('payment_different_targets_second'),
    ]);
    const outcomes = responses
      .map((response, index) => ({
        status: response.status,
        paymentCount: targetPaymentCounts[index],
      }))
      .sort((left, right) => left.status - right.status);

    expect(outcomes).toEqual([
      { status: 201, paymentCount: 1 },
      { status: 409, paymentCount: 0 },
    ]);
    const staleResponse = responses.find((response) => response.status === 409)!;
    await expect(staleResponse.json()).resolves.toMatchObject({
      code: 'PAYMENT_DEBT_VERSION_CONFLICT',
    });
    expect(await readDebtVersion('payment_different_targets_debt')).toBe(2);
  });
});
