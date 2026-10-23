import {
  recordPaymentResponseSchema,
  type RecordPaymentRequest,
  type RecordPaymentResponse,
} from '@collectify/contracts';

import { fetchBackend } from '../../../shared/api/fetch-backend';

export type PaymentSubmissionRequest = Omit<
  RecordPaymentRequest,
  'idempotencyKey'
>;

export async function recordPayment(
  customerId: string,
  request: RecordPaymentRequest,
): Promise<RecordPaymentResponse> {
  return fetchBackend({
    path: `/customers/${encodeURIComponent(customerId)}/payments`,
    method: 'POST',
    body: request,
    responseSchema: recordPaymentResponseSchema,
    unexpectedMessage: 'Payment creation returned an unexpected response.',
  });
}
