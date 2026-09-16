import {
  debtListResponseSchema,
  type DebtListQuery,
  type DebtListResponse,
} from '@collectify/contracts';

import { fetchBackend } from '../../../shared/api/fetch-backend';

export async function listDebts(
  customerId: string,
  query: DebtListQuery,
): Promise<DebtListResponse> {
  const searchParams = new URLSearchParams({
    page: String(query.page),
  });

  return fetchBackend({
    path: `/customers/${encodeURIComponent(customerId)}/debts?${searchParams.toString()}`,
    method: 'GET',
    responseSchema: debtListResponseSchema,
    unexpectedMessage: 'Debt list returned an unexpected response.',
  });
}
