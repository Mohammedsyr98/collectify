import {
  debtResponseSchema,
  type DebtResponse,
  type ReplaceDebtRequest,
} from '@collectify/contracts';

import { fetchBackend } from '../../../shared/api/fetch-backend';

export async function replaceDebt(
  customerId: string,
  debtId: string,
  request: ReplaceDebtRequest,
): Promise<DebtResponse> {
  return fetchBackend({
    path: `/customers/${encodeURIComponent(customerId)}/debts/${encodeURIComponent(debtId)}`,
    method: 'PUT',
    body: request,
    responseSchema: debtResponseSchema,
    unexpectedMessage: 'Debt replacement returned an unexpected response.',
  });
}
