import {
  paymentTargetListResponseSchema,
  type PaymentTargetListResponse,
  type PaymentTargetQuery,
} from '@collectify/contracts';

import { fetchBackend } from '../../../shared/api/fetch-backend';

export async function listPaymentTargets(
  customerId: string,
  query: PaymentTargetQuery,
): Promise<PaymentTargetListResponse> {
  const searchParams = new URLSearchParams({
    page: String(query.page),
  });

  if (query.search) {
    searchParams.set('search', query.search);
  }

  if (query.paymentState) {
    searchParams.set('paymentState', query.paymentState);
  }

  return fetchBackend({
    path: `/customers/${encodeURIComponent(customerId)}/payment-targets?${searchParams.toString()}`,
    method: 'GET',
    responseSchema: paymentTargetListResponseSchema,
    unexpectedMessage: 'Payment target list returned an unexpected response.',
  });
}
