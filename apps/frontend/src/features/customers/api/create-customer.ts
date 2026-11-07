import {
  createCustomerResponseSchema,
  type CreateCustomerRequest,
  type CreateCustomerResponse,
} from '@collectify/contracts';

import { fetchBackend } from '@/shared/api';

export async function createCustomer(
  request: CreateCustomerRequest,
): Promise<CreateCustomerResponse> {
  return fetchBackend({
    path: '/customers',
    method: 'POST',
    body: request,
    responseSchema: createCustomerResponseSchema,
    unexpectedMessage: 'Customer create returned an unexpected response.',
  });
}
