import { customerApiErrorCode } from '@collectify/contracts';
import { and, eq } from 'drizzle-orm';

import type { Database } from '../database/database.service';
import { customers } from '../database/schema';
import { customerException } from './customers.errors';

type RequireOwnedCustomerInput = {
  customerId: string;
  ownerProfileId: string;
};

export async function requireOwnedCustomer(
  executor: Pick<Database, 'select'>,
  input: RequireOwnedCustomerInput,
): Promise<void> {
  const [customer] = await executor
    .select({ id: customers.id })
    .from(customers)
    .where(
      and(
        eq(customers.id, input.customerId),
        eq(customers.ownerProfileId, input.ownerProfileId),
      ),
    )
    .limit(1);

  if (!customer) {
    throw customerException(customerApiErrorCode.customerNotFound);
  }
}
