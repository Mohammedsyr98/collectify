import { keepPreviousData, useQuery } from '@tanstack/react-query';

import type { CustomerListQuery } from '@collectify/contracts';

import { listCustomers } from '../api/list-customers';
import { customerListPageQueryKey } from '../customerQueryKeys';

export function useCustomerListQuery(query: CustomerListQuery) {
  return useQuery({
    queryKey: customerListPageQueryKey(query),
    queryFn: () => listCustomers(query),
    placeholderData: keepPreviousData,
  });
}
