import {
  deletePaymentResponseSchema,
  type DeletePaymentRequest,
  type DeletePaymentResponse,
} from '@collectify/contracts';

import { fetchBackend } from '@/shared/api';

export async function deletePayment(
  customerId: string,
  paymentId: string,
  request: DeletePaymentRequest,
): Promise<DeletePaymentResponse> {
  return fetchBackend({
    path: `/customers/${encodeURIComponent(customerId)}/payments/${encodeURIComponent(paymentId)}`,
    method: 'DELETE',
    body: request,
    responseSchema: deletePaymentResponseSchema,
    unexpectedMessage: 'Payment deletion returned an unexpected response.',
  });
}
