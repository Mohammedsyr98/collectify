import { sql } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import {
  createIntegrationDatabase,
  type IntegrationDatabase,
} from '../../test-support/integration-test-support';
import { buildPaymentHistoryRowsQuery } from '../payment-history.service';

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

  beforeAll(() => {
    database = createIntegrationDatabase();
  });

  beforeEach(async () => {
    await database!.reset();
  });

  it('uses indexed target filtering and bounded top-N work for 10,000 customer payments', async () => {
    await insertPaymentHistoryPlanFixture(database!);
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

    const explainQuery = new PgDialect().sqlToQuery(sql`
      EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
      ${buildPaymentHistoryRowsQuery('payment_history_plan_customer')}
    `);
    const [explainRow] = await database!.query<Record<string, unknown>>(
      explainQuery.sql,
      explainQuery.params,
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

async function insertPaymentHistoryPlanFixture(
  database: IntegrationDatabase,
): Promise<void> {
  await database.query(`
    INSERT INTO "user"
      ("id", "name", "email", "email_verified", "created_at", "updated_at")
    VALUES (
      'payment_history_plan_user',
      'Plan Owner',
      'payment-history-plan-owner@example.com',
      true,
      '2026-01-01 00:00:00',
      '2026-01-01 00:00:00'
    );

    INSERT INTO "owner_profiles"
      ("id", "user_id", "preferred_language", "default_currency", "created_at", "updated_at")
    VALUES (
      'payment_history_plan_owner',
      'payment_history_plan_user',
      'en',
      'USD',
      '2026-01-01 00:00:00',
      '2026-01-01 00:00:00'
    );

    INSERT INTO "customers"
      ("id", "owner_profile_id", "name", "code", "phone_number", "created_at", "updated_at")
    VALUES (
      'payment_history_plan_customer',
      'payment_history_plan_owner',
      'Plan Customer',
      'PLAN-CUSTOMER',
      '+90 555 123 45 67',
      '2026-01-01 00:00:00',
      '2026-01-01 00:00:00'
    );

    INSERT INTO "debts"
      ("id", "customer_id", "description", "total_amount", "currency", "created_at", "updated_at", "version")
    VALUES (
      'payment_history_plan_debt',
      'payment_history_plan_customer',
      'Plan debt',
      '10000.00',
      'USD',
      '2026-01-01 00:00:00',
      '2026-01-01 00:00:00',
      1
    );

    INSERT INTO "debt_schedule_items"
      ("id", "debt_id", "position", "amount", "due_date", "created_at", "updated_at")
    VALUES (
      'payment_history_plan_schedule',
      'payment_history_plan_debt',
      1,
      '10000.00',
      '2026-12-31',
      '2026-01-01 00:00:00',
      '2026-01-01 00:00:00'
    );
  `);
}

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
