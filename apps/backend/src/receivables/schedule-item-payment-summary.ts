import { type PaymentState } from '@collectify/contracts';
import { sql } from 'drizzle-orm';

import type { Database } from '../database/database.service';
import { debtScheduleItems, payments } from '../database/schema';

type SelectExecutor = Pick<Database, 'select'>;

export function createScheduleItemPaymentSummary(executor: SelectExecutor) {
  const paymentTotalsByScheduleItem = executor
    .select({
      scheduleItemId: payments.scheduleItemId,
      paidAmount: sql<string>`cast(sum(${payments.amount}) as numeric(18, 2))`.as('paid_amount'),
      paymentCount: sql<number>`cast(count(*) as integer)`.as('payment_count'),
    })
    .from(payments)
    .groupBy(payments.scheduleItemId)
    .as('payment_totals_by_schedule_item');

  const paidAmountValue = sql<string>`coalesce(${paymentTotalsByScheduleItem.paidAmount}, 0)`;
  const remainingAmountValue = sql<string>`
    ${debtScheduleItems.amount} - ${paidAmountValue}
  `;

  return {
    paymentTotalsByScheduleItem,
    paidAmount: sql<string>`cast(${paidAmountValue} as numeric(18, 2))`,
    remainingAmount: sql<string>`cast(${remainingAmountValue} as numeric(18, 2))`,
    paymentCount: sql<number>`coalesce(${paymentTotalsByScheduleItem.paymentCount}, 0)`,
  };
}

export function getPaymentState(paidAmount: string, remainingAmount: string): PaymentState {
  if (paidAmount === '0.00') {
    return 'unpaid';
  }

  return remainingAmount === '0.00' ? 'paid' : 'partiallyPaid';
}
