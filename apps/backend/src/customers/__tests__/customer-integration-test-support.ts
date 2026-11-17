import { getSetCookie, toCookieHeader } from '../../test-support/http-cookies';
import type {
  IntegrationBackend,
  IntegrationDatabase,
} from '../../test-support/integration-test-support';
import type { createOwnerAuthClient } from '../../test-support/owner-auth-client';

export type CustomerTestOwner = {
  cookieHeader: string;
  ownerProfileId: string;
};

export type CustomerTestContext = {
  database: IntegrationDatabase;
  backend: IntegrationBackend;
  ownerAuth: ReturnType<typeof createOwnerAuthClient>;
};

export function createCustomerTestHelpers(
  getContext: () => CustomerTestContext,
) {
  async function signUpOwner(email: string): Promise<CustomerTestOwner> {
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

  function createCustomer(
    cookieHeader: string,
    body: unknown,
  ): Promise<Response> {
    const { backend } = getContext();

    return fetch(`${backend.baseUrl}/customers`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: cookieHeader,
      },
      body: JSON.stringify(body),
    });
  }

  function updateCustomer(
    cookieHeader: string,
    customerId: string,
    body: unknown,
  ): Promise<Response> {
    const { backend } = getContext();

    return fetch(`${backend.baseUrl}/customers/${customerId}`, {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        cookie: cookieHeader,
      },
      body: JSON.stringify(body),
    });
  }

  function insertCustomer({
    code,
    createdAt,
    address,
    id,
    name,
    ownerProfileId,
    phoneNumber,
  }: {
    address?: string;
    code: string;
    createdAt: string;
    id: string;
    name: string;
    ownerProfileId: string;
    phoneNumber: string;
  }): Promise<unknown[]> {
    const { database } = getContext();

    return database.query(
      `
        INSERT INTO "customers" (
          "id",
          "owner_profile_id",
          "name",
          "code",
          "phone_number",
          "address",
          "created_at",
          "updated_at"
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7::timestamp, $7::timestamp)
      `,
      [id, ownerProfileId, name, code, phoneNumber, address ?? null, createdAt],
    );
  }

  function insertPayment({
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
        VALUES ($1, $2, $3, '2000-01-02'::date, $4::uuid, $1, now(), now())
      `,
      [id, scheduleItemId, amount, idempotencyKey],
    );
  }

  return {
    signUpOwner,
    createCustomer,
    updateCustomer,
    insertCustomer,
    insertPayment,
  };
}
