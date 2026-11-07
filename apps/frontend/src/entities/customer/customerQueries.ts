import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useCallback } from 'react';

import type { CustomerListQuery } from '@collectify/contracts';

import { getCustomer } from './api/get-customer';
import { listCustomers } from './api/list-customers';

export const customerQueryKeys = {
  lists: () => ['customers', 'list'] as const,
  list: (query: CustomerListQuery) =>
    [...customerQueryKeys.lists(), query] as const,
  detail: (customerId: string) => ['customers', customerId] as const,
};

const customerDetailsStaleTimeMs = 30_000;

export function useCustomerListQuery(query: CustomerListQuery) {
  return useQuery({
    queryKey: customerQueryKeys.list(query),
    queryFn: () => listCustomers(query),
    placeholderData: keepPreviousData,
  });
}

export function useCustomerDetailsQuery(customerId: string | undefined) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: customerQueryKeys.detail(customerId ?? ''),
    queryFn: () => getCustomer(customerId!),
    enabled: Boolean(customerId),
    staleTime: customerDetailsStaleTimeMs,
  });
  const customer = query.data?.id === customerId ? query.data : undefined;
  const prefetch = useCallback(
    (nextCustomerId: string) => {
      void queryClient.prefetchQuery({
        queryKey: customerQueryKeys.detail(nextCustomerId),
        queryFn: () => getCustomer(nextCustomerId),
        staleTime: customerDetailsStaleTimeMs,
      });
    },
    [queryClient],
  );

  return {
    ...query,
    customer,
    isLoadingCustomer: Boolean(customerId) && !customer && query.isPending,
    prefetch,
  };
}
