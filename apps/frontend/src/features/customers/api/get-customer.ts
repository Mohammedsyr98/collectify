import {
  customerDetailsResponseSchema,
  type CustomerDetailsResponse,
} from '@collectify/contracts';

import { fetchBackend } from '../../../shared/api/fetch-backend';

export async function getCustomer(
  customerId: string,
): Promise<CustomerDetailsResponse> {
  return fetchBackend({
    path: `/customers/${encodeURIComponent(customerId)}`,
    method: 'GET',
    responseSchema: customerDetailsResponseSchema,
    unexpectedMessage: 'Customer details returned an unexpected response.',
  });
}
