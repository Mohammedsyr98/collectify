import type { QueryClient } from '@tanstack/react-query';

import type { CustomerDetailsResponse } from '@collectify/contracts';

import { customerQueryKeys } from './customerQueries';
import { customerPaymentHistoryQueryKeys } from './customerPaymentHistoryQueries';

export const customerCache = {
  async synchronize(
    queryClient: QueryClient,
    customer: CustomerDetailsResponse,
  ): Promise<void> {
    queryClient.setQueryData(
      customerQueryKeys.detail(customer.id),
      customer,
    );
    await queryClient.invalidateQueries({
      queryKey: customerQueryKeys.lists(),
    });
  },

  async invalidateCustomer(
    queryClient: QueryClient,
    customerId: string,
  ): Promise<void> {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: customerQueryKeys.detail(customerId),
        exact: true,
      }),
      queryClient.invalidateQueries({
        queryKey: customerQueryKeys.lists(),
      }),
    ]);
  },

  async resetPaymentHistory(
    queryClient: QueryClient,
    customerId: string,
  ): Promise<void> {
    await queryClient.resetQueries({
      queryKey: customerPaymentHistoryQueryKeys.customer(customerId),
      exact: true,
    });
  },
};
