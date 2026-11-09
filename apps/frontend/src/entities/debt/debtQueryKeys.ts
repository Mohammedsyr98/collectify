import type { DebtListQuery } from '@collectify/contracts';

export const debtQueryKeys = {
  customerLists: (customerId: string) =>
    ['customers', customerId, 'debts'] as const,
  customerList: (customerId: string, query: DebtListQuery) =>
    [...debtQueryKeys.customerLists(customerId), query] as const,
};
