import {
  updateCustomerResponseSchema,
  type UpdateCustomerRequest,
  type UpdateCustomerResponse,
} from '@collectify/contracts';

import { fetchBackend } from '../../../shared/api/fetch-backend';

export interface UpdateCustomerOptions {
  customerId: string;
  request: UpdateCustomerRequest;
}

export async function updateCustomer({
  customerId,
  request,
}: UpdateCustomerOptions): Promise<UpdateCustomerResponse> {
  return fetchBackend({
    path: `/customers/${encodeURIComponent(customerId)}`,
    method: 'PATCH',
    body: request,
    responseSchema: updateCustomerResponseSchema,
    unexpectedMessage: 'Customer update returned an unexpected response.',
  });
}
