import {
  debtListResponseSchema,
  type DebtListResponse,
} from '@collectify/contracts';

import { fetchBackend } from '../../../shared/api/fetch-backend';

export async function listDebts(customerId: string): Promise<DebtListResponse> {
  return fetchBackend({
    path: `/customers/${encodeURIComponent(customerId)}/debts`,
    method: 'GET',
    responseSchema: debtListResponseSchema,
    unexpectedMessage: 'Debt list returned an unexpected response.',
  });
}
