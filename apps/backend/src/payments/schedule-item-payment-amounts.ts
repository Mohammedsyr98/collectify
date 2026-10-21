import { inArray } from 'drizzle-orm';

import type { Database } from '../database/database.service';
import { payments } from '../database/schema';

type SelectExecutor = Pick<Database, 'select'>;

export async function loadPaymentAmountsByScheduleItemId(
  executor: SelectExecutor,
  scheduleItemIds: readonly string[],
): Promise<ReadonlyMap<string, readonly string[]>> {
  if (scheduleItemIds.length === 0) {
    return new Map();
  }

  const rows = await executor
    .select({
      scheduleItemId: payments.scheduleItemId,
      amount: payments.amount,
    })
    .from(payments)
    .where(inArray(payments.scheduleItemId, scheduleItemIds));

  const paymentAmountsByScheduleItemId = new Map<string, string[]>();

  for (const row of rows) {
    const amounts = paymentAmountsByScheduleItemId.get(row.scheduleItemId) ?? [];
    amounts.push(row.amount);
    paymentAmountsByScheduleItemId.set(row.scheduleItemId, amounts);
  }

  return paymentAmountsByScheduleItemId;
}
