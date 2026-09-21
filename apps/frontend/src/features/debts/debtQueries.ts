import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import {
  isDebtApiErrorCode,
  type CreateDebtRequest,
  type DebtListQuery,
  type ReplaceDebtRequest,
} from '@collectify/contracts';

import { resolveApiErrorDescription } from '../../shared/api/http';
import { useToast } from '../../shared/ui/toast/toastContext';
import {
  customerDetailsQueryKey,
  customerListQueryKey,
} from '../customers/customerQueries';
import { createDebt } from './api/create-debt';
import { deleteDebt } from './api/delete-debt';
import { listDebts } from './api/list-debts';
import { replaceDebt } from './api/replace-debt';

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
    placeholderData: (previousData, previousQuery) =>
      previousQuery?.queryKey[1] === customerId ? previousData : undefined,
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
          describeKnownCode: (code) => t(`debts.errors.${code}`),
          fallbackDescription: t('errors.genericDescription'),
          isKnownCode: isDebtApiErrorCode,
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

export function useReplaceDebtMutation({
  customerId,
  onReplaced,
}: {
  customerId: string;
  onReplaced?: () => void;
}) {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const { showToast } = useToast();

  const mutation = useMutation({
    mutationFn: ({ debtId, request }: { debtId: string; request: ReplaceDebtRequest }) =>
      replaceDebt(customerId, debtId, request),
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
        title: t('debts.toast.edit.successTitle'),
        description: t('debts.toast.edit.successDescription', {
          description: debt.description,
        }),
      });
      onReplaced?.();
    },
    onError: (error) => {
      showToast({
        variant: 'error',
        title: t('debts.toast.edit.errorTitle'),
        description: resolveApiErrorDescription(error, {
          describeKnownCode: (code) => t(`debts.errors.${code}`),
          fallbackDescription: t('errors.genericDescription'),
          isKnownCode: isDebtApiErrorCode,
        }),
      });
    },
  });

  return {
    isReplacing: mutation.isPending,
    replaceDebt: async (debtId: string, request: ReplaceDebtRequest) => {
      try {
        await mutation.mutateAsync({ debtId, request });
      } catch {
        // Failure presentation is handled in the next edit-workflow slice.
      }
    },
  };
}

export function useDeleteDebtMutation({
  customerId,
  onDeleted,
}: {
  customerId: string;
  onDeleted?: () => void;
}) {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const { showToast } = useToast();

  const mutation = useMutation({
    mutationFn: ({ debtId }: { debtId: string; description: string }) =>
      deleteDebt(customerId, debtId),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({
        queryKey: debtListQueryKey(customerId),
      });
      void queryClient.invalidateQueries({
        queryKey: customerDetailsQueryKey(customerId),
      });
      void queryClient.invalidateQueries({ queryKey: customerListQueryKey });
      showToast({
        variant: 'success',
        title: t('debts.toast.delete.successTitle'),
        description: t('debts.toast.delete.successDescription', {
          description: variables.description,
        }),
      });
      onDeleted?.();
    },
    onError: (error) => {
      showToast({
        variant: 'error',
        title: t('debts.toast.delete.errorTitle'),
        description: resolveApiErrorDescription(error, {
          describeKnownCode: (code) => t(`debts.errors.${code}`),
          fallbackDescription: t('errors.genericDescription'),
          isKnownCode: isDebtApiErrorCode,
        }),
      });
    },
  });

  return {
    deleteDebt: async (debtId: string, description: string) => {
      try {
        await mutation.mutateAsync({ debtId, description });
      } catch {
        // Failure presentation is handled by the mutation toast path.
      }
    },
    isDeleting: mutation.isPending,
  };
}
