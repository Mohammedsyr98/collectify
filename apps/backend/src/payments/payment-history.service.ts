import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import {
  paymentApiErrorCode,
  paymentHistoryPageSize,
  type PaymentHistoryItem,
  type PaymentHistoryListResponse,
  type PaymentHistoryQuery,
} from '@collectify/contracts';
import { formatMoney, parseMoney } from '@collectify/domain/money';
import { count, eq, sql } from 'drizzle-orm';
import { z } from 'zod';

import type { AuthenticatedOwner } from '../auth';
import { requireOwnedCustomer } from '../customers';
import { DatabaseService, type Database } from '../database/database.service';
import { debtScheduleItems, debts, payments } from '../database/schema';
import { loadPaidTotalsByScheduleItemId } from '../receivables';

type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];

type PaymentHistoryRow = {
  id: string;
  scheduleItemId: string;
  debtId: string;
  debtDescription: string;
  debtVersion: number;
  amount: string;
  scheduleItemAmount: string;
  currency: 'TRY' | 'USD' | 'EUR';
  paymentDate: string;
  note: string | null;
  schedulePosition: number;
  scheduleCount: number;
  createdAtCursor: string;
};

const paymentHistoryCursorTimestampPattern =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}$/;

const paymentHistoryCursorSchema = z
  .object({
    paymentDate: z.iso.date(),
    createdAt: z
      .iso.datetime({ local: true, precision: 6 })
      .regex(paymentHistoryCursorTimestampPattern),
    id: z.string().min(1).max(500),
  })
  .strict();

type PaymentHistoryCursor = z.infer<typeof paymentHistoryCursorSchema>;

@Injectable()
export class PaymentHistoryService {
  constructor(private readonly databaseService: DatabaseService) {}

  listPaymentHistory(
    currentOwner: AuthenticatedOwner,
    customerId: string,
    query: PaymentHistoryQuery,
  ): Promise<PaymentHistoryListResponse> {
    const cursor = query.cursor ? decodeCursor(query.cursor) : undefined;

    return this.databaseService.db.transaction(
      async (tx) => {
        await requireOwnedCustomer(
          tx,
          {
            ownerProfileId: currentOwner.ownerProfile.id,
            customerId,
          },
        );

        const [{ totalItems } = { totalItems: 0 }] = await tx
          .select({ totalItems: count() })
          .from(payments)
          .innerJoin(
            debtScheduleItems,
            eq(debtScheduleItems.id, payments.scheduleItemId),
          )
          .innerJoin(debts, eq(debts.id, debtScheduleItems.debtId))
          .where(eq(debts.customerId, customerId));

        const rows = await loadPaymentRows(tx, customerId, cursor);
        const visibleRows = rows.slice(0, paymentHistoryPageSize);
        const lastVisibleRow = visibleRows.at(-1);
        const paidTotals = await loadPaidTotalsByScheduleItemId(
          tx,
          [...new Set(visibleRows.map(({ scheduleItemId }) => scheduleItemId))],
        );

        return {
          items: visibleRows.map((row) => toPaymentHistoryItem(row, paidTotals)),
          pageSize: paymentHistoryPageSize,
          totalItems,
          nextCursor:
            rows.length > paymentHistoryPageSize && lastVisibleRow
              ? encodeCursor(lastVisibleRow)
              : null,
        };
      },
      {
        isolationLevel: 'repeatable read',
        accessMode: 'read only',
      },
    );
  }
}

async function loadPaymentRows(
  tx: Transaction,
  customerId: string,
  cursor: PaymentHistoryCursor | undefined,
): Promise<PaymentHistoryRow[]> {
  const result = await tx.execute<PaymentHistoryRow>(
    buildPaymentHistoryRowsQuery(customerId, cursor),
  );

  return result.rows;
}

export function buildPaymentHistoryRowsQuery(
  customerId: string,
  cursor?: PaymentHistoryCursor,
) {
  const cursorBoundary = cursor
    ? sql`and (payment_date, created_at, id) < (
        ${cursor.paymentDate}::date,
        ${cursor.createdAt}::timestamp,
        ${cursor.id}
      )`
    : sql``;
  return sql`
    select
      payment_page.id as "id",
      payment_page.schedule_item_id as "scheduleItemId",
      debt.id as "debtId",
      debt.description as "debtDescription",
      debt.version as "debtVersion",
      payment_page.amount as "amount",
      schedule_item.amount as "scheduleItemAmount",
      debt.currency as "currency",
      payment_page.payment_date as "paymentDate",
      payment_page.note as "note",
      schedule_item.position as "schedulePosition",
      (
        select count(*)::integer
        from debt_schedule_items as schedule_count_item
        where schedule_count_item.debt_id = schedule_item.debt_id
      ) as "scheduleCount",
      to_char(
        payment_page.created_at,
        'YYYY-MM-DD"T"HH24:MI:SS.US'
      ) as "createdAtCursor"
    from debts as debt
    inner join debt_schedule_items as schedule_item
      on schedule_item.debt_id = debt.id
    inner join lateral (
      select payment.*
      from payments as payment
      where payment.schedule_item_id = schedule_item.id
        ${cursorBoundary}
      order by
        payment.payment_date desc,
        payment.created_at desc,
        payment.id desc
      limit ${paymentHistoryPageSize + 1}
    ) as payment_page on true
    where debt.customer_id = ${customerId}
    order by
      payment_page.payment_date desc,
      payment_page.created_at desc,
      payment_page.id desc
    limit ${paymentHistoryPageSize + 1}
  `;
}

function toPaymentHistoryItem(
  row: PaymentHistoryRow,
  paidTotals: ReadonlyMap<string, string>,
): PaymentHistoryItem {
  const totalPaid = parseMoney(paidTotals.get(row.scheduleItemId) ?? '0.00');
  const paidAfterDeletion = totalPaid - parseMoney(row.amount);
  const maximumReplacementAmount = formatMoney(
    parseMoney(row.scheduleItemAmount) - totalPaid + parseMoney(row.amount),
  );

  return {
    id: row.id,
    scheduleItemId: row.scheduleItemId,
    debtId: row.debtId,
    debtDescription: row.debtDescription,
    debtVersion: row.debtVersion,
    amount: row.amount,
    maximumReplacementAmount,
    paymentStateAfterDeletion: paidAfterDeletion === 0n ? 'unpaid' : 'partiallyPaid',
    currency: row.currency,
    paymentDate: row.paymentDate,
    note: row.note,
    plan:
      row.scheduleCount > 1
        ? {
            type: 'installment',
            position: row.schedulePosition,
            total: row.scheduleCount,
          }
        : { type: 'onePayment' },
  };
}

function encodeCursor(row: PaymentHistoryRow): string {
  const cursor: PaymentHistoryCursor = {
    paymentDate: row.paymentDate,
    createdAt: row.createdAtCursor,
    id: row.id,
  };

  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
}

function decodeCursor(encodedCursor: string): PaymentHistoryCursor {
  try {
    const decoded = Buffer.from(encodedCursor, 'base64url').toString('utf8');
    const parsed = paymentHistoryCursorSchema.safeParse(JSON.parse(decoded));

    if (parsed.success) {
      return parsed.data;
    }
  } catch {
    // Invalid cursor details are deliberately hidden behind one stable response.
  }

  throw invalidCursorException();
}

function invalidCursorException(): HttpException {
  return new HttpException(
    {
      code: paymentApiErrorCode.validationError,
      message: 'Check the highlighted fields.',
      fieldErrors: {
        cursor: ['Payment history cursor is invalid.'],
      },
    },
    HttpStatus.BAD_REQUEST,
  );
}
