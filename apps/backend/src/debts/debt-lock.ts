import { and, eq } from 'drizzle-orm';

import type { Database } from '../database/database.service';
import { customers, debts } from '../database/schema';

type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];

type FindOwnedDebtForUpdateInput = {
  ownerProfileId: string;
  customerId: string;
  debtId: string;
};

export async function findOwnedDebtForUpdate(
  tx: Transaction,
  input: FindOwnedDebtForUpdateInput,
) {
  const [row] = await tx
    .select({ debt: debts })
    .from(debts)
    .innerJoin(customers, eq(customers.id, debts.customerId))
    .where(
      and(
        eq(debts.id, input.debtId),
        eq(debts.customerId, input.customerId),
        eq(customers.ownerProfileId, input.ownerProfileId),
      ),
    )
    .limit(1)
    .for('update', { of: debts });

  return row?.debt ?? null;
}
