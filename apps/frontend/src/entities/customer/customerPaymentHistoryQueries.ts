import { useInfiniteQuery } from '@tanstack/react-query';

import { listPaymentHistory } from './api/list-payment-history';

export const customerPaymentHistoryQueryKeys = {
  customer: (customerId: string) =>
    ['customers', customerId, 'payments', 'history'] as const,
};

export function useCustomerPaymentHistoryQuery(
  customerId: string | undefined,
) {
  return useInfiniteQuery({
    queryKey: customerPaymentHistoryQueryKeys.customer(customerId ?? ''),
    queryFn: ({ pageParam }) => listPaymentHistory(customerId!, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: Boolean(customerId),
  });
}
