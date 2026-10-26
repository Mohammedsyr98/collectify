import { useQuery } from '@tanstack/react-query';

import type { PaymentTargetQuery } from '@collectify/contracts';

import { listPaymentTargets } from './api/list-payment-targets';

export const paymentTargetListQueryKey = (customerId: string) =>
  ['customers', customerId, 'payment-targets'] as const;

export const paymentTargetListPageQueryKey = (customerId: string, query: PaymentTargetQuery) =>
  [...paymentTargetListQueryKey(customerId), query] as const;

export function usePaymentTargetListQuery(customerId: string, query: PaymentTargetQuery) {
  return useQuery({
    queryKey: paymentTargetListPageQueryKey(customerId, query),
    queryFn: () => listPaymentTargets(customerId, query),
  });
}
