import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import {
  isCustomerApiErrorCode,
  type CreateDebtRequest,
  type DebtListQuery,
} from '@collectify/contracts';

import { resolveApiErrorDescription } from '../../shared/api/http';
import { useToast } from '../../shared/ui/toast/toastContext';
import {
  customerDetailsQueryKey,
  customerListQueryKey,
} from '../customers/customerQueries';
import { createDebt } from './api/create-debt';
import { listDebts } from './api/list-debts';

export const debtListQueryKey = (customerId: string) =>
  ['customers', customerId, 'debts'] as const;

export const debtListPageQueryKey = (
  customerId: string,
  query: DebtListQuery,
) => [...debtListQueryKey(customerId), query] as const;

export function useDebtListQuery(
  customerId: string | undefined,
  query: DebtListQuery,
) {
  return useQuery({
    queryKey: debtListPageQueryKey(customerId ?? '', query),
    queryFn: () => listDebts(customerId!, query),
    enabled: Boolean(customerId),
  });
}

export function useCreateDebtMutation({
  customerId,
  onCreated,
}: {
  customerId: string;
  onCreated?: () => void;
}) {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const { showToast } = useToast();

  const mutation = useMutation({
    mutationFn: (request: CreateDebtRequest) => createDebt(customerId, request),
    onSuccess: (debt) => {
      void queryClient.invalidateQueries({
        queryKey: debtListQueryKey(customerId),
      });
      void queryClient.invalidateQueries({
        queryKey: customerDetailsQueryKey(customerId),
      });
      void queryClient.invalidateQueries({ queryKey: customerListQueryKey });
      showToast({
        variant: 'success',
        title: t('debts.toast.create.successTitle'),
        description: t('debts.toast.create.successDescription', {
          description: debt.description,
        }),
      });
      onCreated?.();
    },
    onError: (error) => {
      showToast({
        variant: 'error',
        title: t('debts.toast.create.errorTitle'),
        description: resolveApiErrorDescription(error, {
          describeKnownCode: (code) => t(`customers.errors.${code}`),
          fallbackDescription: t('errors.genericDescription'),
          isKnownCode: isCustomerApiErrorCode,
        }),
      });
    },
  });

  return {
    createDebt: async (request: CreateDebtRequest) => {
      try {
        await mutation.mutateAsync(request);
      } catch {
        // Error presentation is handled by the mutation toast path.
      }
    },
    isCreating: mutation.isPending,
  };
}
