import { debtListResponseSchema } from '@collectify/contracts';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { getSetCookie, toCookieHeader } from '../test-support/http-cookies';
import {
  startIntegrationPostgres,
  type IntegrationBackend,
  type IntegrationPostgres,
} from '../test-support/integration-postgres';
import { createOwnerAuthClient } from '../test-support/owner-auth-client';

type Owner = {
  cookieHeader: string;
  ownerProfileId: string;
};

type ScheduleFixture = {
  id: string;
  amount: string;
  dueDate: string;
};

const defaultDebtTotalAmount = '100.00';
const defaultPaymentDate = '2026-10-20';

type DebtFixture = {
  id: string;
  customerId: string;
  totalAmount?: string;
  currency?: string;
  version?: number;
  scheduleItems?: ScheduleFixture[];
};

type SingleSchedulePaymentScenarioOptions = {
  ownerEmail: string;
  customerId: string;
  debtId: string;
  debt?: Omit<DebtFixture, 'id' | 'customerId' | 'scheduleItems'>;
};

type SingleSchedulePaymentScenario = {
  owner: Owner;
  customerId: string;
  debtId: string;
  scheduleItemId: string;
};

type RecordPaymentRequest = {
  targetScheduleItemId: string;
  amount: string;
  paymentDate: string;
  expectedDebtVersion: number;
  idempotencyKey: string;
  note?: string | null;
};

function paymentKey(sequence: number): string {
  return `10000000-0000-4000-8000-${sequence.toString().padStart(12, '0')}`;
}

const defaultPaymentRequest = {
  amount: '10.00',
  paymentDate: defaultPaymentDate,
  expectedDebtVersion: 1,
  note: null,
} as const;

function makePaymentRequest(
  targetScheduleItemId: string,
  idempotencySequence: number,
  overrides: Partial<RecordPaymentRequest> = {},
): RecordPaymentRequest {
  return {
    ...defaultPaymentRequest,
    targetScheduleItemId,
    idempotencyKey: paymentKey(idempotencySequence),
    ...overrides,
  };
}

describe('record payment routes', () => {
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

  it('records a partial one-payment debt payment', async () => {
    const { owner, customerId, scheduleItemId } = await setupSingleSchedulePaymentScenario({
      ownerEmail: 'payment-one-payment-owner@example.com',
      customerId: 'customer_payment_one_payment',
      debtId: 'payment_one_payment_debt',
    });

    const response = await recordPayment(
      owner.cookieHeader,
      customerId,
      makePaymentRequest(scheduleItemId, 2, {
        amount: '25.30',
        note: 'Cash received',
      }),
    );

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.payment).toMatchObject({
      scheduleItemId,
      amount: '25.30',
      paymentDate: '2026-10-20',
      note: 'Cash received',
      idempotencyKey: '10000000-0000-4000-8000-000000000002',
    });
    expect(body.payment.id).toEqual(expect.any(String));
    expect(body.payment.createdAt).toEqual(expect.any(String));
    expect(body.payment.updatedAt).toEqual(expect.any(String));
    expect(await countPayments(scheduleItemId)).toBe(1);

    const debtListResponse = await fetch(
      `${backend!.baseUrl}/customers/${customerId}/debts`,
      { headers: { cookie: owner.cookieHeader } },
    );
    expect(debtListResponse.status).toBe(200);
    const debtList = debtListResponseSchema.parse(await debtListResponse.json());
    expect(debtList.items[0]).toMatchObject({
      paidAmount: '25.30',
      remainingAmount: '74.70',
      paymentState: 'partiallyPaid',
      paymentCount: 1,
      version: 2,
    });
  });

  it('records an installment payment only against the requested schedule item', async () => {
    const owner = await signUpOwner('payment-installment-owner@example.com');
    await insertCustomer(owner.ownerProfileId, {
      id: 'customer_payment_installment',
    });
    await insertDebt({
      id: 'payment_installment_debt',
      customerId: 'customer_payment_installment',
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

  it('rejects a payment above the target remainder and a payment against a paid target', async () => {
    const { owner, customerId, scheduleItemId } = await setupSingleSchedulePaymentScenario({
      ownerEmail: 'payment-balance-owner@example.com',
      customerId: 'customer_payment_balance',
      debtId: 'payment_balance_debt',
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

  it('rejects a payment when the expected debt version is stale', async () => {
    const { owner, customerId, debtId, scheduleItemId } = await setupSingleSchedulePaymentScenario({
      ownerEmail: 'payment-version-owner@example.com',
      customerId: 'customer_payment_version',
      debtId: 'payment_version_debt',
    });

    const firstResponse = await recordPayment(
      owner.cookieHeader,
      customerId,
      makePaymentRequest(scheduleItemId, 15),
    );
    expect(firstResponse.status).toBe(201);

    const staleResponse = await recordPayment(
      owner.cookieHeader,
      customerId,
      makePaymentRequest(scheduleItemId, 16, {
        amount: '20.00',
      }),
    );

    expect(staleResponse.status).toBe(409);
    await expect(staleResponse.json()).resolves.toMatchObject({
      code: 'PAYMENT_DEBT_VERSION_CONFLICT',
    });
    expect(await countPayments(scheduleItemId)).toBe(1);
    expect(await readDebtVersion(debtId)).toBe(2);
  });

  it('replays an exact idempotent request with canonicalized amount and blank note without incrementing the debt twice', async () => {
    const { owner, customerId, debtId, scheduleItemId } = await setupSingleSchedulePaymentScenario({
      ownerEmail: 'payment-idempotency-owner@example.com',
      customerId: 'customer_payment_idempotency',
      debtId: 'payment_idempotency_debt',
    });

    const request = makePaymentRequest(scheduleItemId, 17, {
      amount: '25.2',
      note: ' ',
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
      makePaymentRequest(scheduleItemId, 17, {
        amount: '25.20',
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
    });

    const firstResponse = await recordPayment(
      owner.cookieHeader,
      customerId,
      makePaymentRequest(scheduleItemId, 18),
    );
    expect(firstResponse.status).toBe(201);

    const reusedResponse = await recordPayment(
      owner.cookieHeader,
      customerId,
      makePaymentRequest(scheduleItemId, 18, {
        amount: '20.00',
      }),
    );

    expect(reusedResponse.status).toBe(409);
    await expect(reusedResponse.json()).resolves.toMatchObject({
      code: 'PAYMENT_IDEMPOTENCY_KEY_REUSED',
    });
    expect(await countPayments(scheduleItemId)).toBe(1);
    expect(await readDebtVersion(debtId)).toBe(2);
  });

  it('serializes concurrent payments against one target so they cannot collectively overpay it', async () => {
    const { owner, customerId, debtId, scheduleItemId } = await setupSingleSchedulePaymentScenario({
      ownerEmail: 'payment-concurrency-owner@example.com',
      customerId: 'customer_payment_concurrency',
      debtId: 'payment_concurrency_debt',
    });

    const responses = await Promise.all([
      recordPayment(
        owner.cookieHeader,
        customerId,
        makePaymentRequest(scheduleItemId, 19, {
          amount: '60.00',
        }),
      ),
      recordPayment(
        owner.cookieHeader,
        customerId,
        makePaymentRequest(scheduleItemId, 20, {
          amount: '60.00',
        }),
      ),
    ]);

    expect(responses.map((response) => response.status).sort()).toEqual([
      201,
      409,
    ]);
    expect(await countPayments(scheduleItemId)).toBe(1);
    expect(await readPaymentAmount(scheduleItemId)).toBe(
      '60.00',
    );
    expect(await readDebtVersion(debtId)).toBe(2);
  });

  it('serializes concurrent payments against different targets of one debt through the shared debt version', async () => {
    const owner = await signUpOwner('payment-different-targets-owner@example.com');
    await insertCustomer(owner.ownerProfileId, {
      id: 'customer_payment_different_targets',
    });
    await insertDebt({
      id: 'payment_different_targets_debt',
      customerId: 'customer_payment_different_targets',
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
        makePaymentRequest('payment_different_targets_first', 21),
      ),
      recordPayment(
        owner.cookieHeader,
        'customer_payment_different_targets',
        makePaymentRequest('payment_different_targets_second', 22),
      ),
    ]);

    expect(responses.map((response) => response.status).sort()).toEqual([
      201,
      409,
    ]);
    const staleResponse = responses.find((response) => response.status === 409)!;
    await expect(staleResponse.json()).resolves.toMatchObject({
      code: 'PAYMENT_DEBT_VERSION_CONFLICT',
    });
    const targetPaymentCounts = await Promise.all([
      countPayments('payment_different_targets_first'),
      countPayments('payment_different_targets_second'),
    ]);
    expect(targetPaymentCounts.sort()).toEqual([0, 1]);
    expect(await readDebtVersion('payment_different_targets_debt')).toBe(2);
  });

  it('rejects a payment when a debt amount replacement commits first', async () => {
    const { owner, customerId, debtId, scheduleItemId } = await setupSingleSchedulePaymentScenario({
      ownerEmail: 'payment-replacement-first-owner@example.com',
      customerId: 'customer_payment_replacement_first',
      debtId: 'payment_replacement_first_debt',
    });

    const replacementResponse = await replaceDebt(
      owner.cookieHeader,
      customerId,
      debtId,
      {
        expectedVersion: 1,
        description: 'Updated payment debt',
        totalAmount: '120.00',
        currency: 'USD',
        scheduleItems: [
          {
            id: scheduleItemId,
            amount: '120.00',
            dueDate: '2026-11-30',
          },
        ],
      },
    );
    expect(replacementResponse.status).toBe(200);

    const paymentResponse = await recordPayment(
      owner.cookieHeader,
      customerId,
      makePaymentRequest(scheduleItemId, 23),
    );

    expect(paymentResponse.status).toBe(409);
    await expect(paymentResponse.json()).resolves.toMatchObject({
      code: 'PAYMENT_DEBT_VERSION_CONFLICT',
    });
    expect(await countPayments(scheduleItemId)).toBe(0);
  });

  it('rejects a stale debt amount replacement when payment creation commits first', async () => {
    const { owner, customerId, debtId, scheduleItemId } = await setupSingleSchedulePaymentScenario({
      ownerEmail: 'payment-replacement-second-owner@example.com',
      customerId: 'customer_payment_replacement_second',
      debtId: 'payment_replacement_second_debt',
    });

    const paymentResponse = await recordPayment(
      owner.cookieHeader,
      customerId,
      makePaymentRequest(scheduleItemId, 24),
    );
    expect(paymentResponse.status).toBe(201);

    const replacementResponse = await replaceDebt(
      owner.cookieHeader,
      customerId,
      debtId,
      {
        expectedVersion: 1,
        description: 'Stale replacement',
        totalAmount: '120.00',
        currency: 'USD',
        scheduleItems: [
          {
            id: scheduleItemId,
            amount: '120.00',
            dueDate: '2026-11-30',
          },
        ],
      },
    );

    expect(replacementResponse.status).toBe(409);
    await expect(replacementResponse.json()).resolves.toMatchObject({
      code: 'DEBT_VERSION_CONFLICT',
    });
    expect(await readDebtVersion(debtId)).toBe(2);
    expect(await countPayments(scheduleItemId)).toBe(1);
  });

  it('allows debt deletion to win before payment creation and then hides the deleted target', async () => {
    const { owner, customerId, debtId, scheduleItemId } = await setupSingleSchedulePaymentScenario({
      ownerEmail: 'payment-delete-first-owner@example.com',
      customerId: 'customer_payment_delete_first',
      debtId: 'payment_delete_first_debt',
    });

    const deleteResponse = await deleteDebt(
      owner.cookieHeader,
      customerId,
      debtId,
    );
    expect(deleteResponse.status).toBe(204);

    const paymentResponse = await recordPayment(
      owner.cookieHeader,
      customerId,
      makePaymentRequest(scheduleItemId, 25),
    );

    expect(paymentResponse.status).toBe(404);
    await expect(paymentResponse.json()).resolves.toMatchObject({
      code: 'PAYMENT_TARGET_NOT_FOUND',
    });
    expect(await countPayments(scheduleItemId)).toBe(0);
  });

  it('rejects debt deletion after payment creation without removing the payment', async () => {
    const { owner, customerId, debtId, scheduleItemId } = await setupSingleSchedulePaymentScenario({
      ownerEmail: 'payment-delete-second-owner@example.com',
      customerId: 'customer_payment_delete_second',
      debtId: 'payment_delete_second_debt',
    });

    const paymentResponse = await recordPayment(
      owner.cookieHeader,
      customerId,
      makePaymentRequest(scheduleItemId, 26),
    );
    expect(paymentResponse.status).toBe(201);

    const deleteResponse = await deleteDebt(
      owner.cookieHeader,
      customerId,
      debtId,
    );

    expect(deleteResponse.status).toBe(409);
    await expect(deleteResponse.json()).resolves.toMatchObject({
      code: 'DEBT_HAS_PAYMENTS',
    });
    expect(await countPayments(scheduleItemId)).toBe(1);
  });

  it('keeps currency and payment-plan safeguards active after public payment creation', async () => {
    const { owner, customerId, debtId, scheduleItemId } = await setupSingleSchedulePaymentScenario({
      ownerEmail: 'payment-mutation-safeguards-owner@example.com',
      customerId: 'customer_payment_mutation_safeguards',
      debtId: 'payment_mutation_safeguards_debt',
    });

    const paymentResponse = await recordPayment(
      owner.cookieHeader,
      customerId,
      makePaymentRequest(scheduleItemId, 27),
    );
    expect(paymentResponse.status).toBe(201);

    const currencyResponse = await replaceDebt(
      owner.cookieHeader,
      customerId,
      debtId,
      {
        expectedVersion: 2,
        description: 'Currency change',
        totalAmount: '100.00',
        currency: 'EUR',
        scheduleItems: [
          {
            id: scheduleItemId,
            amount: '100.00',
            dueDate: '2026-11-30',
          },
        ],
      },
    );
    expect(currencyResponse.status).toBe(409);
    await expect(currencyResponse.json()).resolves.toMatchObject({
      code: 'DEBT_CURRENCY_CHANGE_BLOCKED',
    });

    const planResponse = await replaceDebt(
      owner.cookieHeader,
      customerId,
      debtId,
      {
        expectedVersion: 2,
        description: 'Plan conversion',
        totalAmount: '100.00',
        currency: 'USD',
        scheduleItems: [
          { amount: '40.00', dueDate: '2026-10-30' },
          { amount: '60.00', dueDate: '2026-11-30' },
        ],
      },
    );
    expect(planResponse.status).toBe(409);
    await expect(planResponse.json()).resolves.toMatchObject({
      code: 'DEBT_PAYMENT_PLAN_CHANGE_BLOCKED',
    });
    expect(await readDebtVersion(debtId)).toBe(2);
    expect(await countPayments(scheduleItemId)).toBe(1);
  });

  it('rolls back the payment when the debt-version update fails after the payment write', async () => {
    const { owner, customerId, debtId, scheduleItemId } = await setupSingleSchedulePaymentScenario({
      ownerEmail: 'payment-rollback-owner@example.com',
      customerId: 'customer_payment_rollback',
      debtId: 'payment_rollback_debt',
      debt: { version: 2147483647 },
    });

    const response = await recordPayment(
      owner.cookieHeader,
      customerId,
      makePaymentRequest(scheduleItemId, 28, {
        expectedDebtVersion: 2147483647,
      }),
    );

    expect(response.status).toBe(500);
    expect(await countPayments(scheduleItemId)).toBe(0);
    expect(await readDebtVersion(debtId)).toBe(2147483647);
  });

  async function setupSingleSchedulePaymentScenario({
    ownerEmail,
    customerId,
    debtId,
    debt,
  }: SingleSchedulePaymentScenarioOptions): Promise<SingleSchedulePaymentScenario> {
    const owner = await signUpOwner(ownerEmail);
    await insertCustomer(owner.ownerProfileId, { id: customerId });
    await insertDebt({ id: debtId, customerId, ...debt });

    return {
      owner,
      customerId,
      debtId,
      scheduleItemId: `${debtId}_schedule`,
    };
  }

  async function signUpOwner(email: string): Promise<Owner> {
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

  async function insertCustomer(
    ownerProfileId: string,
    { id, code = id.toUpperCase() }: { id: string; code?: string },
  ): Promise<void> {
    await postgres!.query(
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
      [id, ownerProfileId, 'Payment Customer', code, '+90 555 123 45 67'],
    );
  }

  async function insertDebt({
    id,
    customerId,
    totalAmount = defaultDebtTotalAmount,
    currency = 'USD',
    version = 1,
    scheduleItems = [
      {
        id: `${id}_schedule`,
        amount: totalAmount,
        dueDate: '2026-10-30',
      },
    ],
  }: DebtFixture): Promise<void> {
    await postgres!.query(
      `
        INSERT INTO "debts" (
          "id",
          "customer_id",
          "description",
          "total_amount",
          "currency",
          "created_at",
          "updated_at",
          "version"
        )
        VALUES ($1, $2, $3, $4, $5, $6::timestamp, $6::timestamp, $7)
      `,
      [
        id,
        customerId,
        'Payment debt',
        totalAmount,
        currency,
        '2026-09-10 10:00:00',
        version,
      ],
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
          '2026-09-10 10:00:00',
        ],
      );
    }
  }

  function recordPayment(
    cookieHeader: string | undefined,
    customerId: string,
    body: RecordPaymentRequest,
  ): Promise<Response> {
    return fetch(`${backend!.baseUrl}/customers/${customerId}/payments`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(cookieHeader ? { cookie: cookieHeader } : {}),
      },
      body: JSON.stringify(body),
    });
  }

  function replaceDebt(
    cookieHeader: string,
    customerId: string,
    debtId: string,
    body: unknown,
  ): Promise<Response> {
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

  function deleteDebt(
    cookieHeader: string,
    customerId: string,
    debtId: string,
  ): Promise<Response> {
    return fetch(
      `${backend!.baseUrl}/customers/${customerId}/debts/${debtId}`,
      {
        method: 'DELETE',
        headers: { cookie: cookieHeader },
      },
    );
  }

  async function countPayments(scheduleItemId: string): Promise<number> {
    const [row] = await postgres!.query<{ count: number }>(
      `
        SELECT count(*)::int AS "count"
        FROM "payments"
        WHERE "schedule_item_id" = $1
      `,
      [scheduleItemId],
    );
    return row?.count ?? 0;
  }

  async function readPaymentAmount(scheduleItemId: string): Promise<string | undefined> {
    const [row] = await postgres!.query<{ amount: string }>(
      `
        SELECT "amount"
        FROM "payments"
        WHERE "schedule_item_id" = $1
      `,
      [scheduleItemId],
    );
    return row?.amount;
  }

  async function readDebtVersion(debtId: string): Promise<number | undefined> {
    const [row] = await postgres!.query<{ version: number }>(
      'SELECT "version" FROM "debts" WHERE "id" = $1',
      [debtId],
    );
    return row?.version;
  }

});
