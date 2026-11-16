import { getSetCookie, toCookieHeader } from '../../test-support/http-cookies';
import type {
  IntegrationBackend,
  IntegrationDatabase,
} from '../../test-support/integration-test-support';
import type { createOwnerAuthClient } from '../../test-support/owner-auth-client';

export type PaymentTestOwner = {
  cookieHeader: string;
  ownerProfileId: string;
};

type ScheduleFixture = {
  id: string;
  amount: string;
  dueDate: string;
};

const defaultDebtTotalAmount = '100.00';

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

export type SingleSchedulePaymentScenario = {
  owner: PaymentTestOwner;
  customerId: string;
  debtId: string;
  scheduleItemId: string;
};

export type RecordPaymentRequest = {
  targetScheduleItemId: string;
  amount: string;
  paymentDate: string;
  expectedDebtVersion: number;
  idempotencyKey: string;
  note?: string | null;
};

export type PersistedPayment = {
  id: string;
  scheduleItemId: string;
  amount: string;
  paymentDate: string;
  note: string | null;
  idempotencyKey: string;
};

export type PaymentTestContext = {
  database: IntegrationDatabase;
  backend: IntegrationBackend;
  ownerAuth: ReturnType<typeof createOwnerAuthClient>;
};

const defaultPaymentRequest = {
  amount: '10.00',
  paymentDate: '2026-10-20',
  expectedDebtVersion: 1,
  note: null,
} as const;

function paymentKey(sequence: number): string {
  return `10000000-0000-4000-8000-${sequence.toString().padStart(12, '0')}`;
}

export function makePaymentRequest(
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

export function createPaymentTestHelpers(
  getContext: () => PaymentTestContext,
) {
  async function signUpOwner(email: string): Promise<PaymentTestOwner> {
    const { database, ownerAuth } = getContext();
    const response = await ownerAuth.signUpOwner({
      name: 'Owner',
      email,
      password: 'password123',
      preferredLanguage: 'en',
      defaultCurrency: 'USD',
    });

    if (response.status !== 200) {
      throw new Error(`Owner sign-up failed with status ${response.status}`);
    }

    const [ownerProfile] = await database.query<{ id: string }>(
      `
        SELECT "owner_profiles"."id"
        FROM "owner_profiles"
        JOIN "user" ON "user"."id" = "owner_profiles"."user_id"
        WHERE "user"."email" = $1
      `,
      [email],
    );

    if (!ownerProfile) {
      throw new Error(`Owner profile was not created for ${email}`);
    }

    return {
      cookieHeader: toCookieHeader(getSetCookie(response.headers)),
      ownerProfileId: ownerProfile.id,
    };
  }

  function insertCustomer(
    ownerProfileId: string,
    { id, code = id.toUpperCase() }: { id: string; code?: string },
  ): Promise<unknown[]> {
    const { database } = getContext();

    return database.query(
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
    const { database } = getContext();

    await database.query(
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
      await database.query(
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
    const { backend } = getContext();

    return fetch(`${backend.baseUrl}/customers/${customerId}/payments`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(cookieHeader ? { cookie: cookieHeader } : {}),
      },
      body: JSON.stringify(body),
    });
  }

  async function countPayments(scheduleItemId: string): Promise<number> {
    const { database } = getContext();
    const [row] = await database.query<{ count: number }>(
      `
        SELECT count(*)::int AS "count"
        FROM "payments"
        WHERE "schedule_item_id" = $1
      `,
      [scheduleItemId],
    );
    return row?.count ?? 0;
  }

  async function readPayments(scheduleItemId: string): Promise<PersistedPayment[]> {
    const { database } = getContext();

    return database.query<PersistedPayment>(
      `
        SELECT
          "id",
          "schedule_item_id" AS "scheduleItemId",
          "amount"::text AS "amount",
          "payment_date"::text AS "paymentDate",
          "note",
          "idempotency_key"::text AS "idempotencyKey"
        FROM "payments"
        WHERE "schedule_item_id" = $1
        ORDER BY "created_at", "id"
      `,
      [scheduleItemId],
    );
  }

  async function readPaymentAmount(scheduleItemId: string): Promise<string | undefined> {
    const { database } = getContext();
    const [row] = await database.query<{ amount: string }>(
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
    const { database } = getContext();
    const [row] = await database.query<{ version: number }>(
      'SELECT "version" FROM "debts" WHERE "id" = $1',
      [debtId],
    );
    return row?.version;
  }

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

  return {
    setupSingleSchedulePaymentScenario,
    signUpOwner,
    insertCustomer,
    insertDebt,
    recordPayment,
    countPayments,
    readPayments,
    readPaymentAmount,
    readDebtVersion,
  };
}
