import {
  customerListResponseSchema,
  type CustomerListQuery,
  type CustomerListResponse,
} from '@collectify/contracts';

import { fetchBackend } from '../../../shared/api/fetch-backend';

export async function listCustomers(
  query: CustomerListQuery,
): Promise<CustomerListResponse> {
  return fetchBackend({
    path: `/customers?page=${query.page}`,
    method: 'GET',
    responseSchema: customerListResponseSchema,
    unexpectedMessage: 'Customer list returned an unexpected response.',
  });
}
