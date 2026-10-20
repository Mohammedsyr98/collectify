import { type PaymentState } from '@collectify/contracts';
import { eq, inArray, sql } from 'drizzle-orm';

import type { Database } from '../database/database.service';
import { debtScheduleItems, payments } from '../database/schema';

type SelectExecutor = Pick<Database, 'select'>;
type ScheduleItemRow = typeof debtScheduleItems.$inferSelect;

export type PaymentSummary = {
  paidAmount: string;
  remainingAmount: string;
  paymentState: PaymentState;
  paymentCount: number;
};

export type ScheduleItemPaymentDetails = ScheduleItemRow & PaymentSummary;

export type DebtPaymentDetails = {
  scheduleItems: ScheduleItemPaymentDetails[];
  paymentSummary: PaymentSummary;
};

type ScheduleItemPaymentRow = {
  scheduleItem: ScheduleItemRow;
  paidAmount: string;
  remainingAmount: string;
  paymentCount: number;
  debtPaidAmount: string;
  debtRemainingAmount: string;
  debtPaymentCount: number;
};

export async function loadPaymentDetailsByDebtId(
  executor: SelectExecutor,
  debtIds: readonly string[],
): Promise<ReadonlyMap<string, DebtPaymentDetails>> {
  if (debtIds.length === 0) {
    return new Map();
  }

  const rows = await loadScheduleItemPaymentRows(executor, debtIds);
  return groupPaymentRowsByDebtId(rows);
}

async function loadScheduleItemPaymentRows(
  executor: SelectExecutor,
  debtIds: readonly string[],
): Promise<ScheduleItemPaymentRow[]> {
  const paymentTotalsByScheduleItem = executor
    .select({
      scheduleItemId: payments.scheduleItemId,
      paidAmount:
        sql<string>`cast(sum(${payments.amount}) as numeric(18, 2))`.as(
          'paid_amount',
        ),
      paymentCount: sql<number>`cast(count(*) as integer)`.as('payment_count'),
    })
    .from(payments)
    .groupBy(payments.scheduleItemId)
    .as('payment_totals_by_schedule_item');

  const paidAmountValue = sql<string>`coalesce(${paymentTotalsByScheduleItem.paidAmount}, 0)`;
  const remainingAmountValue = sql<string>`
    ${debtScheduleItems.amount} - ${paidAmountValue}
  `;
  const paymentCountValue = sql<number>`coalesce(${paymentTotalsByScheduleItem.paymentCount}, 0)`;
  const paidAmount = sql<string>`cast(${paidAmountValue} as numeric(18, 2))`;
  const remainingAmount = sql<string>`cast(${remainingAmountValue} as numeric(18, 2))`;
  const debtPaidAmount = sql<string>`cast(
    sum(${paidAmountValue}) over (partition by ${debtScheduleItems.debtId})
    as numeric(18, 2)
  )`;
  const debtRemainingAmount = sql<string>`cast(
    sum(${remainingAmountValue}) over (partition by ${debtScheduleItems.debtId})
    as numeric(18, 2)
  )`;
  const debtPaymentCount = sql<number>`cast(
    sum(${paymentCountValue}) over (partition by ${debtScheduleItems.debtId})
    as integer
  )`;

  return executor
    .select({
      scheduleItem: debtScheduleItems,
      paidAmount: paidAmount.as('paid_amount'),
      remainingAmount: remainingAmount.as('remaining_amount'),
      paymentCount: paymentCountValue.as('payment_count'),
      debtPaidAmount: debtPaidAmount.as('debt_paid_amount'),
      debtRemainingAmount: debtRemainingAmount.as('debt_remaining_amount'),
      debtPaymentCount: debtPaymentCount.as('debt_payment_count'),
    })
    .from(debtScheduleItems)
    .leftJoin(
      paymentTotalsByScheduleItem,
      eq(paymentTotalsByScheduleItem.scheduleItemId, debtScheduleItems.id),
    )
    .where(inArray(debtScheduleItems.debtId, debtIds))
    .orderBy(debtScheduleItems.debtId, debtScheduleItems.position);
}

function groupPaymentRowsByDebtId(
  rows: readonly ScheduleItemPaymentRow[],
): ReadonlyMap<string, DebtPaymentDetails> {
  const detailsByDebtId = new Map<string, DebtPaymentDetails>();

  for (const row of rows) {
    const details = detailsByDebtId.get(row.scheduleItem.debtId) ?? {
      scheduleItems: [],
      paymentSummary: {
        paidAmount: row.debtPaidAmount,
        remainingAmount: row.debtRemainingAmount,
        paymentState: getPaymentState(
          row.debtPaidAmount,
          row.debtRemainingAmount,
        ),
        paymentCount: row.debtPaymentCount,
      },
    };

    details.scheduleItems.push({
      ...row.scheduleItem,
      paidAmount: row.paidAmount,
      remainingAmount: row.remainingAmount,
      paymentState: getPaymentState(row.paidAmount, row.remainingAmount),
      paymentCount: row.paymentCount,
    });
    detailsByDebtId.set(row.scheduleItem.debtId, details);
  }

  return detailsByDebtId;
}

function getPaymentState(
  paidAmount: string,
  remainingAmount: string,
): PaymentState {
  if (paidAmount === '0.00') {
    return 'unpaid';
  }

  return remainingAmount === '0.00' ? 'paid' : 'partiallyPaid';
}
