import {
  debtResponseSchema,
  type CreateDebtRequest,
  type DebtResponse,
} from '@collectify/contracts';

import { fetchBackend } from '../../../shared/api/fetch-backend';

export async function createDebt(
  customerId: string,
  request: CreateDebtRequest,
): Promise<DebtResponse> {
  return fetchBackend({
    path: `/customers/${encodeURIComponent(customerId)}/debts`,
    method: 'POST',
    body: request,
    responseSchema: debtResponseSchema,
    unexpectedMessage: 'Debt create returned an unexpected response.',
  });
}
