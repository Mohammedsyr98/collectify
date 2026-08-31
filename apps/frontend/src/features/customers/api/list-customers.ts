import {
  customerListResponseSchema,
  type CustomerListResponse,
} from '@collectify/contracts';

import { fetchBackend } from '../../../shared/api/fetch-backend';

export async function listCustomers(): Promise<CustomerListResponse> {
  return fetchBackend({
    path: '/customers',
    method: 'GET',
    responseSchema: customerListResponseSchema,
    unexpectedMessage: 'Customer list returned an unexpected response.',
  });
}
