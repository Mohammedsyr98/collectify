import {
  replacePaymentResponseSchema,
  type ReplacePaymentRequest,
  type ReplacePaymentResponse,
} from '@collectify/contracts';

import { fetchBackend } from '@/shared/api';

export async function replacePayment(
  customerId: string,
  paymentId: string,
  request: ReplacePaymentRequest,
): Promise<ReplacePaymentResponse> {
  return fetchBackend({
    path: `/customers/${encodeURIComponent(customerId)}/payments/${encodeURIComponent(paymentId)}`,
    method: 'PUT',
    body: request,
    responseSchema: replacePaymentResponseSchema,
    unexpectedMessage: 'Payment correction returned an unexpected response.',
  });
}
