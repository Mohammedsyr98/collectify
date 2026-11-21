import {
  paymentHistoryListResponseSchema,
  type PaymentHistoryListResponse,
} from '@collectify/contracts';

import { fetchBackend } from '@/shared/api';

export function listPaymentHistory(
  customerId: string,
  cursor?: string,
): Promise<PaymentHistoryListResponse> {
  const searchParams = new URLSearchParams();

  if (cursor) {
    searchParams.set('cursor', cursor);
  }

  const query = searchParams.size > 0 ? `?${searchParams.toString()}` : '';

  return fetchBackend({
    path: `/customers/${encodeURIComponent(customerId)}/payments${query}`,
    method: 'GET',
    responseSchema: paymentHistoryListResponseSchema,
    unexpectedMessage: 'Payment history returned an unexpected response.',
  });
}
