import { getSetCookie, toCookieHeader } from '../../test-support/http-cookies';
import type {
  IntegrationBackend,
  IntegrationDatabase,
} from '../../test-support/integration-test-support';
import type { createOwnerAuthClient } from '../../test-support/owner-auth-client';

export type DebtWithScheduleRow = {
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

export type ScheduleItemRow = {
  id: string;
  position: number;
  amount: string;
  dueDate: string;
};

export type DebtTestContext = {
  database: IntegrationDatabase;
  backend: IntegrationBackend;
  ownerAuth: ReturnType<typeof createOwnerAuthClient>;
};

export function createDebtTestHelpers(getContext: () => DebtTestContext) {
  return {
    replaceDebtRequest(
      cookieHeader: string,
      debtId: string,
      body: unknown,
      customerId = 'customer_debt',
    ) {
      const { backend } = getContext();

      return fetch(
        `${backend.baseUrl}/customers/${customerId}/debts/${debtId}`,
        {
          method: 'PUT',
          headers: {
            'content-type': 'application/json',
            cookie: cookieHeader,
          },
          body: JSON.stringify(body),
        },
      );
    },

    readDebtWithScheduleRows(debtId: string): Promise<DebtWithScheduleRow[]> {
      const { database } = getContext();

      return database.query<DebtWithScheduleRow>(`
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
    },

    readScheduleItems(debtId: string): Promise<ScheduleItemRow[]> {
      const { database } = getContext();

      return database.query<ScheduleItemRow>(`
        SELECT
          s."id" AS "id",
          s."position" AS "position",
          s."amount"::text AS "amount",
          s."due_date"::text AS "dueDate"
        FROM "debt_schedule_items" s
        WHERE s."debt_id" = $1
        ORDER BY s."position"
      `, [debtId]);
    },

    async signUpOwner(
      email: string,
    ): Promise<{ cookieHeader: string; ownerProfileId: string }> {
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
    },

    insertCustomer(
      ownerProfileId: string,
      {
        code = 'DEBT-001',
        id = 'customer_debt',
      }: { code?: string; id?: string } = {},
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
        [id, ownerProfileId, 'Debt Customer', code, '+90 555 123 45 67'],
      );
    },

    async insertDebt({
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
            "updated_at"
          )
          VALUES ($1, $2, $3, $4, $5, $6::timestamp, $6::timestamp)
        `,
        [id, customerId, description, totalAmount, currency, createdAt],
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
            createdAt,
          ],
        );
      }
    },

    insertPayment({
      id,
      scheduleItemId,
      amount,
      idempotencyKey,
    }: {
      id: string;
      scheduleItemId: string;
      amount: string;
      idempotencyKey: string;
    }): Promise<unknown[]> {
      const { database } = getContext();

      return database.query(
        `
          INSERT INTO "payments" (
            "id",
            "schedule_item_id",
            "amount",
            "payment_date",
            "idempotency_key",
            "request_fingerprint",
            "created_at",
            "updated_at"
          )
          VALUES ($1, $2, $3, '2026-09-15'::date, $4::uuid, $1, now(), now())
        `,
        [id, scheduleItemId, amount, idempotencyKey],
      );
    },
  };
}
