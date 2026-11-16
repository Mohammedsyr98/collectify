import { recordPaymentResponseSchema } from '@collectify/contracts';
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

describe('record payment routes', () => {
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
    readPayments,
    readDebtVersion,
  } = createPaymentTestHelpers(() => context);

  beforeAll(async () => {
    postgres = createIntegrationDatabase();
    backend = await startIntegrationBackend();
    ownerAuth = createOwnerAuthClient(backend.baseUrl);
    context = { database: postgres, backend, ownerAuth };
  });

  beforeEach(async () => {
    await postgres!.reset();
  });

  afterAll(async () => {
    await backend.app.close();
  });

  it('rejects an unauthenticated payment request without writing a payment', async () => {
    const { customerId, scheduleItemId } = await setupSingleSchedulePaymentScenario({
      ownerEmail: 'payment-auth-owner@example.com',
      customerId: 'customer_payment_auth',
      debtId: 'payment_auth_debt',
    });

    const response = await recordPayment(
      undefined,
      customerId,
      makePaymentRequest(scheduleItemId, 1),
    );

    expect(response.status).toBe(401);
    expect(await countPayments(scheduleItemId)).toBe(0);
  });

  it('records a partial one-payment debt payment and increments the debt version', async () => {
    const { owner, customerId, debtId, scheduleItemId } = await setupSingleSchedulePaymentScenario({
      ownerEmail: 'payment-one-payment-owner@example.com',
      customerId: 'customer_payment_one_payment',
      debtId: 'payment_one_payment_debt',
      debt: {
        totalAmount: '100.00',
        version: 1,
      },
    });

    const request = makePaymentRequest(scheduleItemId, 2, {
      amount: '25.30',
      paymentDate: '2026-10-20',
      expectedDebtVersion: 1,
      note: 'Cash received',
    });
    const response = await recordPayment(
      owner.cookieHeader,
      customerId,
      request,
    );

    expect(response.status).toBe(201);
    const body = recordPaymentResponseSchema.parse(await response.json());
    expect(body.payment).toMatchObject({
      scheduleItemId,
      amount: request.amount,
      paymentDate: request.paymentDate,
      note: request.note,
      idempotencyKey: request.idempotencyKey,
    });
    expect(await readPayments(scheduleItemId)).toEqual([
      {
        id: body.payment.id,
        scheduleItemId,
        amount: request.amount,
        paymentDate: request.paymentDate,
        note: request.note,
        idempotencyKey: request.idempotencyKey,
      },
    ]);
    expect(await readDebtVersion(debtId)).toBe(2);
  });

  it('records an installment payment only against the requested schedule item', async () => {
    const owner = await signUpOwner('payment-installment-owner@example.com');
    await insertCustomer(owner.ownerProfileId, {
      id: 'customer_payment_installment',
    });
    await insertDebt({
      id: 'payment_installment_debt',
      customerId: 'customer_payment_installment',
      totalAmount: '100.00',
      version: 1,
      scheduleItems: [
        {
          id: 'payment_installment_first',
          amount: '60.00',
          dueDate: '2026-09-30',
        },
        {
          id: 'payment_installment_second',
          amount: '40.00',
          dueDate: '2026-10-30',
        },
      ],
    });

    const response = await recordPayment(
      owner.cookieHeader,
      'customer_payment_installment',
      makePaymentRequest('payment_installment_second', 3, {
        amount: '15.00',
        expectedDebtVersion: 1,
      }),
    );

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.payment).toMatchObject({
      scheduleItemId: 'payment_installment_second',
      amount: '15.00',
    });
    expect(await countPayments('payment_installment_first')).toBe(0);
    expect(await countPayments('payment_installment_second')).toBe(1);
  });

  it('returns the same not-found response for a missing target, wrong customer, and wrong owner', async () => {
    const owner = await signUpOwner('payment-target-owner@example.com');
    await insertCustomer(owner.ownerProfileId, {
      id: 'customer_payment_target',
      code: 'PAYMENT-TARGET',
    });
    await insertCustomer(owner.ownerProfileId, {
      id: 'customer_payment_other_path',
      code: 'PAYMENT-OTHER-PATH',
    });
    await insertDebt({
      id: 'payment_target_debt',
      customerId: 'customer_payment_target',
    });

    const otherOwner = await signUpOwner('payment-target-other-owner@example.com');
    await insertCustomer(otherOwner.ownerProfileId, {
      id: 'customer_payment_other_owner',
      code: 'PAYMENT-OTHER-OWNER',
    });

    const requests = [
      recordPayment(
        owner.cookieHeader,
        'customer_payment_target',
        makePaymentRequest('missing_payment_target', 4),
      ),
      recordPayment(
        owner.cookieHeader,
        'customer_payment_other_path',
        makePaymentRequest('payment_target_debt_schedule', 5),
      ),
      recordPayment(
        otherOwner.cookieHeader,
        'customer_payment_other_owner',
        makePaymentRequest('payment_target_debt_schedule', 6),
      ),
    ];

    const responses = await Promise.all(requests);

    expect(responses.map((response) => response.status)).toEqual([404, 404, 404]);
    const bodies = await Promise.all(responses.map((response) => response.json()));
    expect(bodies).toEqual([
      { code: 'PAYMENT_TARGET_NOT_FOUND', message: expect.any(String) },
      { code: 'PAYMENT_TARGET_NOT_FOUND', message: expect.any(String) },
      { code: 'PAYMENT_TARGET_NOT_FOUND', message: expect.any(String) },
    ]);
    expect(await countPayments('payment_target_debt_schedule')).toBe(0);
  });

  it('rejects a future payment date using the Istanbul business date without writing a payment', async () => {
    const { owner, customerId, scheduleItemId } = await setupSingleSchedulePaymentScenario({
      ownerEmail: 'payment-future-date-owner@example.com',
      customerId: 'customer_payment_future_date',
      debtId: 'payment_future_date_debt',
    });

    const response = await recordPayment(
      owner.cookieHeader,
      customerId,
      makePaymentRequest(scheduleItemId, 11, {
        paymentDate: '2999-01-01',
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      code: 'PAYMENT_DATE_IN_FUTURE',
    });
    expect(await countPayments(scheduleItemId)).toBe(0);
  });

  it("rejects a payment that exceeds the schedule item's remaining amount", async () => {
    const { owner, customerId, scheduleItemId } = await setupSingleSchedulePaymentScenario({
      ownerEmail: 'payment-balance-owner@example.com',
      customerId: 'customer_payment_balance',
      debtId: 'payment_balance_debt',
      debt: { totalAmount: '100.00' },
    });

    const overpaymentResponse = await recordPayment(
      owner.cookieHeader,
      customerId,
      makePaymentRequest(scheduleItemId, 12, {
        amount: '100.01',
      }),
    );

    expect(overpaymentResponse.status).toBe(409);
    await expect(overpaymentResponse.json()).resolves.toMatchObject({
      code: 'PAYMENT_AMOUNT_EXCEEDS_REMAINING',
    });
    expect(await countPayments(scheduleItemId)).toBe(0);
  });

  it('rejects a payment against an already-paid target', async () => {
    const { owner, customerId, scheduleItemId } = await setupSingleSchedulePaymentScenario({
      ownerEmail: 'payment-paid-target-owner@example.com',
      customerId: 'customer_payment_paid_target',
      debtId: 'payment_paid_target_debt',
      debt: { totalAmount: '100.00' },
    });

    const fullPaymentResponse = await recordPayment(
      owner.cookieHeader,
      customerId,
      makePaymentRequest(scheduleItemId, 13, {
        amount: '100.00',
      }),
    );
    expect(fullPaymentResponse.status).toBe(201);

    const paidTargetResponse = await recordPayment(
      owner.cookieHeader,
      customerId,
      makePaymentRequest(scheduleItemId, 14, {
        amount: '1.00',
        expectedDebtVersion: 2,
      }),
    );

    expect(paidTargetResponse.status).toBe(409);
    await expect(paidTargetResponse.json()).resolves.toMatchObject({
      code: 'PAYMENT_TARGET_ALREADY_PAID',
    });
    expect(await countPayments(scheduleItemId)).toBe(1);
  });

  it('leaves payment and debt state unchanged when the debt version cannot be incremented', async () => {
    const maximumIntegerVersion = 2_147_483_647;
    const { owner, customerId, debtId, scheduleItemId } = await setupSingleSchedulePaymentScenario({
      ownerEmail: 'payment-rollback-owner@example.com',
      customerId: 'customer_payment_rollback',
      debtId: 'payment_rollback_debt',
      debt: { version: maximumIntegerVersion },
    });

    const response = await recordPayment(
      owner.cookieHeader,
      customerId,
      makePaymentRequest(scheduleItemId, 28, {
        expectedDebtVersion: maximumIntegerVersion,
      }),
    );

    expect(response.status).toBe(500);
    expect(await countPayments(scheduleItemId)).toBe(0);
    expect(await readDebtVersion(debtId)).toBe(maximumIntegerVersion);
  });

});
