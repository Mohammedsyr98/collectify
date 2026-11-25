import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import {
  deletePaymentResponseSchema,
  paymentApiErrorCode,
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

describe('payment deletion route', () => {
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

  it('permanently removes the payment and returns the reopened debt and customer balances', async () => {
    const helpers = createPaymentTestHelpers(() => context);
    const { owner, customerId, debtId, scheduleItemId } =
      await helpers.setupSingleSchedulePaymentScenario({
        ownerEmail: 'payment-deletion-owner@example.com',
        customerId: 'customer_payment_deletion',
        debtId: 'payment_deletion_debt',
        debt: { totalAmount: '100.00', version: 1 },
      });
    const recordedResponse = await helpers.recordPayment(
      owner.cookieHeader,
      customerId,
      makePaymentRequest(scheduleItemId, 71, { amount: '25.00' }),
    );
    expect(recordedResponse.status).toBe(201);
    const recorded = (await recordedResponse.json()) as RecordPaymentResponse;

    const deletionResponse = await helpers.deletePayment(
      owner.cookieHeader,
      customerId,
      recorded.payment.id,
      { expectedDebtVersion: 2 },
    );

    expect(deletionResponse.status).toBe(200);
    const deleted = deletePaymentResponseSchema.parse(await deletionResponse.json());
    expect(deleted).toMatchObject({
      deletedPaymentId: recorded.payment.id,
      debt: {
        id: debtId,
        version: 3,
        paidAmount: '0.00',
        remainingAmount: '100.00',
        paymentState: 'unpaid',
        paymentCount: 0,
        scheduleItems: [
          {
            id: scheduleItemId,
            paidAmount: '0.00',
            remainingAmount: '100.00',
            paymentState: 'unpaid',
            paymentCount: 0,
          },
        ],
      },
      customerFinancialSummary: [
        {
          currency: 'USD',
          totalDebtAmount: '100.00',
          totalPaidAmount: '0.00',
          remainingAmount: '100.00',
        },
      ],
    });
    expect(await helpers.readPayments(scheduleItemId)).toEqual([]);
    expect(await helpers.readDebtVersion(debtId)).toBe(3);
  });

  it('rejects a stale debt version without deleting the payment or advancing the version', async () => {
    const helpers = createPaymentTestHelpers(() => context);
    const { owner, customerId, debtId, scheduleItemId } =
      await helpers.setupSingleSchedulePaymentScenario({
        ownerEmail: 'payment-deletion-stale-owner@example.com',
        customerId: 'customer_payment_deletion_stale',
        debtId: 'payment_deletion_stale_debt',
        debt: { totalAmount: '100.00', version: 1 },
      });
    const recordedResponse = await helpers.recordPayment(
      owner.cookieHeader,
      customerId,
      makePaymentRequest(scheduleItemId, 72, { amount: '25.00' }),
    );
    const recorded = (await recordedResponse.json()) as RecordPaymentResponse;

    const deletionResponse = await helpers.deletePayment(
      owner.cookieHeader,
      customerId,
      recorded.payment.id,
      { expectedDebtVersion: 1 },
    );

    expect(deletionResponse.status).toBe(409);
    expect(await deletionResponse.json()).toMatchObject({
      code: paymentApiErrorCode.paymentDebtVersionConflict,
    });
    expect(await helpers.readPayments(scheduleItemId)).toHaveLength(1);
    expect(await helpers.readDebtVersion(debtId)).toBe(2);
  });

  it('rejects the original create retry after the payment and its idempotency key were deleted', async () => {
    const helpers = createPaymentTestHelpers(() => context);
    const { owner, customerId, debtId, scheduleItemId } =
      await helpers.setupSingleSchedulePaymentScenario({
        ownerEmail: 'payment-deletion-retry-owner@example.com',
        customerId: 'customer_payment_deletion_retry',
        debtId: 'payment_deletion_retry_debt',
        debt: { totalAmount: '100.00', version: 1 },
      });
    const originalRequest = makePaymentRequest(scheduleItemId, 73, {
      amount: '25.00',
    });
    const recordedResponse = await helpers.recordPayment(
      owner.cookieHeader,
      customerId,
      originalRequest,
    );
    const recorded = (await recordedResponse.json()) as RecordPaymentResponse;
    const deletionResponse = await helpers.deletePayment(
      owner.cookieHeader,
      customerId,
      recorded.payment.id,
      { expectedDebtVersion: 2 },
    );
    expect(deletionResponse.status).toBe(200);

    const retryResponse = await helpers.recordPayment(
      owner.cookieHeader,
      customerId,
      originalRequest,
    );

    expect(retryResponse.status).toBe(409);
    expect(await retryResponse.json()).toMatchObject({
      code: paymentApiErrorCode.paymentDebtVersionConflict,
    });
    expect(await helpers.readPayments(scheduleItemId)).toEqual([]);
    expect(await helpers.readDebtVersion(debtId)).toBe(3);
  });

  it('hides a payment from a different owner and leaves its row and version untouched', async () => {
    const helpers = createPaymentTestHelpers(() => context);
    const { owner, customerId, debtId, scheduleItemId } =
      await helpers.setupSingleSchedulePaymentScenario({
        ownerEmail: 'payment-deletion-owner-check@example.com',
        customerId: 'customer_payment_deletion_owner_check',
        debtId: 'payment_deletion_owner_check_debt',
        debt: { totalAmount: '100.00', version: 1 },
      });
    const otherOwner = await helpers.signUpOwner('payment-deletion-other-owner@example.com');
    const recordedResponse = await helpers.recordPayment(
      owner.cookieHeader,
      customerId,
      makePaymentRequest(scheduleItemId, 74, { amount: '25.00' }),
    );
    const recorded = (await recordedResponse.json()) as RecordPaymentResponse;

    const deletionResponse = await helpers.deletePayment(
      otherOwner.cookieHeader,
      customerId,
      recorded.payment.id,
      { expectedDebtVersion: 2 },
    );

    expect(deletionResponse.status).toBe(404);
    expect(await deletionResponse.json()).toMatchObject({
      code: paymentApiErrorCode.paymentNotFound,
    });
    expect(await helpers.readPayments(scheduleItemId)).toHaveLength(1);
    expect(await helpers.readDebtVersion(debtId)).toBe(2);
  });

  it('serializes a delete against a concurrent payment update', async () => {
    const helpers = createPaymentTestHelpers(() => context);
    const { owner, customerId, debtId, scheduleItemId } =
      await helpers.setupSingleSchedulePaymentScenario({
        ownerEmail: 'payment-deletion-concurrency-owner@example.com',
        customerId: 'customer_payment_deletion_concurrency',
        debtId: 'payment_deletion_concurrency_debt',
        debt: { totalAmount: '100.00', version: 1 },
      });
    const recordedResponse = await helpers.recordPayment(
      owner.cookieHeader,
      customerId,
      makePaymentRequest(scheduleItemId, 75, { amount: '25.00' }),
    );
    const recorded = (await recordedResponse.json()) as RecordPaymentResponse;

    const [deletionResponse, updateResponse] = await Promise.all([
      helpers.deletePayment(owner.cookieHeader, customerId, recorded.payment.id, {
        expectedDebtVersion: 2,
      }),
      helpers.replacePayment(owner.cookieHeader, customerId, recorded.payment.id, {
        targetScheduleItemId: scheduleItemId,
        amount: '30.00',
        paymentDate: '2026-10-21',
        note: null,
        expectedSourceDebtVersion: 2,
      }),
    ]);
    const deletionWon = deletionResponse.status === 200;
    const updateWon = updateResponse.status === 200;

    expect(Number(deletionWon) + Number(updateWon)).toBe(1);
    expect(await helpers.readDebtVersion(debtId)).toBe(3);

    const remainingPayments = await helpers.readPayments(scheduleItemId);
    if (deletionWon) {
      expect([404, 409]).toContain(updateResponse.status);
      expect(remainingPayments).toEqual([]);
    } else {
      expect(deletionResponse.status).toBe(409);
      expect(remainingPayments).toMatchObject([{ amount: '30.00' }]);
    }
  });
});
