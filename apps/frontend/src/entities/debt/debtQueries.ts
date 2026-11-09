import { useQuery } from '@tanstack/react-query';

import type { DebtListQuery } from '@collectify/contracts';

import { listDebts } from './api/list-debts';
import { debtQueryKeys } from './debtQueryKeys';

export function useDebtListQuery(
  customerId: string | undefined,
  query: DebtListQuery,
) {
  return useQuery({
    queryKey: debtQueryKeys.customerList(customerId ?? '', query),
    queryFn: () => listDebts(customerId!, query),
    enabled: Boolean(customerId),
    placeholderData: (previousData, previousQuery) =>
      previousQuery?.queryKey[1] === customerId ? previousData : undefined,
  });
}
