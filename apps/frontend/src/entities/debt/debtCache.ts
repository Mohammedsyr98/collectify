import type { QueryClient } from '@tanstack/react-query';

import { debtQueryKeys } from './debtQueryKeys';

export const debtCache = {
  async invalidateCustomerDebts(
    queryClient: QueryClient,
    customerId: string,
  ): Promise<void> {
    await queryClient.invalidateQueries({
      queryKey: debtQueryKeys.customerLists(customerId),
    });
  },
};
