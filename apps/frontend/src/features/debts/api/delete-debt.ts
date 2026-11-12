import { fetchBackend } from '@/shared/api';

export async function deleteDebt(
  customerId: string,
  debtId: string,
): Promise<void> {
  return fetchBackend({
    path: `/customers/${encodeURIComponent(customerId)}/debts/${encodeURIComponent(debtId)}`,
    method: 'DELETE',
    responseMode: 'noContent',
    unexpectedMessage: 'Debt deletion returned an unexpected response.',
  });
}
