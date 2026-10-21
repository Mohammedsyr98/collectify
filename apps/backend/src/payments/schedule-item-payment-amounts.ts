import { inArray, sql } from 'drizzle-orm';

import type { Database } from '../database/database.service';
import { payments } from '../database/schema';

type SelectExecutor = Pick<Database, 'select'>;

export async function loadPaidTotalsByScheduleItemId(
  executor: SelectExecutor,
  scheduleItemIds: readonly string[],
): Promise<ReadonlyMap<string, string>> {
  if (scheduleItemIds.length === 0) {
    return new Map();
  }

  const rows = await executor
    .select({
      scheduleItemId: payments.scheduleItemId,
      paidAmount: sql<string>`coalesce(sum(${payments.amount}), 0)`,
    })
    .from(payments)
    .where(inArray(payments.scheduleItemId, scheduleItemIds))
    .groupBy(payments.scheduleItemId);

  return new Map(
    rows.map(({ scheduleItemId, paidAmount }) => [scheduleItemId, paidAmount]),
  );
}
