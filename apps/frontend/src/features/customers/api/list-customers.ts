import {
  customerListResponseSchema,
  type CustomerListQuery,
  type CustomerListResponse,
} from '@collectify/contracts';

import { fetchBackend } from '../../../shared/api/fetch-backend';

export async function listCustomers(
  query: CustomerListQuery,
): Promise<CustomerListResponse> {
  const searchParams = new URLSearchParams({
    page: String(query.page),
  });

  if (query.search) {
    searchParams.set('search', query.search);
  }

  return fetchBackend({
    path: `/customers?${searchParams.toString()}`,
    method: 'GET',
    responseSchema: customerListResponseSchema,
    unexpectedMessage: 'Customer list returned an unexpected response.',
  });
}
