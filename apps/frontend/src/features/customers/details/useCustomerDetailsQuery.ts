import { useQuery } from '@tanstack/react-query';

import { getCustomer } from '../api/get-customer';
import { customerDetailsQueryKey } from '../customerQueryKeys';

export function useCustomerDetailsQuery(customerId: string | undefined) {
  return useQuery({
    queryKey: customerDetailsQueryKey(customerId ?? ''),
    queryFn: () => getCustomer(customerId!),
    enabled: Boolean(customerId),
  });
}
