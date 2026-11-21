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
  type PaymentTestContext,
} from './payment-integration-test-support';

type ExplainNode = {
  'Actual Rows'?: number;
  'Index Cond'?: string;
  'Index Name'?: string;
  'Node Type': string;
  Plans?: ExplainNode[];
  'Relation Name'?: string;
  'Sort Method'?: string;
};

describe('payment history query plan', () => {
  let database: IntegrationDatabase | undefined;
  let backend: IntegrationBackend | undefined;
  let ownerAuth: ReturnType<typeof createOwnerAuthClient> | undefined;
  let context: PaymentTestContext;

  beforeAll(async () => {
    database = createIntegrationDatabase();
    backend = await startIntegrationBackend();
    ownerAuth = createOwnerAuthClient(backend.baseUrl);
    context = { database, backend, ownerAuth };
  });

  beforeEach(async () => {
    await database!.reset();
  });

  afterAll(async () => {
    await backend?.app.close();
  });

  it('uses indexed target filtering and bounded top-N work for 10,000 customer payments', async () => {
    const helpers = createPaymentTestHelpers(() => context);
    const owner = await helpers.signUpOwner('payment-history-plan-owner@example.com');
    await helpers.insertCustomer(owner.ownerProfileId, {
      id: 'payment_history_plan_customer',
    });
    await helpers.insertDebt({
      id: 'payment_history_plan_debt',
      customerId: 'payment_history_plan_customer',
      totalAmount: '10000.00',
      scheduleItems: [
        {
          id: 'payment_history_plan_schedule',
          amount: '10000.00',
          dueDate: '2026-12-31',
        },
      ],
    });
    await database!.query(
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
        SELECT
          'history_plan_payment_' || lpad(series::text, 5, '0'),
          'payment_history_plan_schedule',
          '1.00',
          ('2026-01-01'::date + ((series - 1) % 365)),
          ('40000000-0000-4000-8000-' || lpad(series::text, 12, '0'))::uuid,
          'history_plan_fingerprint_' || series,
          '2026-01-01 00:00:00'::timestamp + series * interval '1 second',
          '2026-01-01 00:00:00'::timestamp + series * interval '1 second'
        FROM generate_series(1, 10000) AS series
      `,
    );
    await database!.query('ANALYZE "payments"');
    await database!.query('ANALYZE "debt_schedule_items"');
    await database!.query('ANALYZE "debts"');

    const [explainRow] = await database!.query<Record<string, unknown>>(
      `
        EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
        SELECT
          "payment_page"."id",
          "payment_page"."schedule_item_id",
          "debts"."id" AS "debt_id",
          "debts"."description",
          "debts"."version",
          "payment_page"."amount",
          "debts"."currency",
          "payment_page"."payment_date",
          "payment_page"."note",
          "debt_schedule_items"."position",
          (
            SELECT count(*)::integer
            FROM "debt_schedule_items" AS "schedule_count_item"
            WHERE "schedule_count_item"."debt_id" = "debt_schedule_items"."debt_id"
          ) AS "schedule_count",
          to_char("payment_page"."created_at", 'YYYY-MM-DD"T"HH24:MI:SS.US')
        FROM "debts"
        INNER JOIN "debt_schedule_items"
          ON "debt_schedule_items"."debt_id" = "debts"."id"
        INNER JOIN LATERAL (
          SELECT "payments".*
          FROM "payments"
          WHERE "payments"."schedule_item_id" = "debt_schedule_items"."id"
          ORDER BY
            "payments"."payment_date" DESC,
            "payments"."created_at" DESC,
            "payments"."id" DESC
          LIMIT 11
        ) AS "payment_page" ON true
        WHERE "debts"."customer_id" = $1
        ORDER BY
          "payment_page"."payment_date" DESC,
          "payment_page"."created_at" DESC,
          "payment_page"."id" DESC
        LIMIT 11
      `,
      ['payment_history_plan_customer'],
    );

    const plan = readPlan(explainRow);
    const nodes = flattenPlan(plan);
    const paymentIndexAccess = nodes.find(
      (node) =>
        node['Index Name'] === 'payments_schedule_item_history_idx' &&
        node['Relation Name'] === 'payments',
    );
    const sortNodes = nodes.filter((node) => node['Node Type'] === 'Sort');

    expect(plan['Node Type']).toBe('Limit');
    expect(plan['Actual Rows']).toBeLessThanOrEqual(11);
    expect(paymentIndexAccess, JSON.stringify(plan, null, 2)).toBeDefined();
    expect(paymentIndexAccess?.['Index Cond']).toContain('schedule_item_id');
    expect(paymentIndexAccess?.['Actual Rows']).toBeLessThanOrEqual(11);
    expect(
      nodes.some(
        (node) =>
          node['Node Type'] === 'Seq Scan' &&
          node['Relation Name'] === 'payments',
      ),
    ).toBe(false);
    expect(
      sortNodes.every(
        (node) =>
          (node['Actual Rows'] ?? Number.POSITIVE_INFINITY) <= 11 &&
          (node.Plans?.[0]?.['Actual Rows'] ?? Number.POSITIVE_INFINITY) <= 11,
      ),
    ).toBe(true);
  });
});

function readPlan(row: Record<string, unknown> | undefined): ExplainNode {
  const explain = row?.['QUERY PLAN'];

  if (!Array.isArray(explain)) {
    throw new Error('Expected PostgreSQL JSON EXPLAIN output.');
  }

  const document = explain[0] as { Plan?: ExplainNode } | undefined;

  if (!document?.Plan) {
    throw new Error('Expected PostgreSQL JSON EXPLAIN plan root.');
  }

  return document.Plan;
}

function flattenPlan(plan: ExplainNode): ExplainNode[] {
  return [plan, ...(plan.Plans ?? []).flatMap(flattenPlan)];
}
