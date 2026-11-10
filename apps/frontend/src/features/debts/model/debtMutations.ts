import {
  useMutation,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import {
  isDebtApiErrorCode,
  type CreateDebtRequest,
  type ReplaceDebtRequest,
} from '@collectify/contracts';

import { customerCache } from '@/entities/customer';
import { debtCache } from '@/entities/debt';
import { resolveApiErrorDescription } from '@/shared/api';
import { useToast } from '@/shared/ui/toast';

import { createDebt } from '../api/create-debt';
import { deleteDebt } from '../api/delete-debt';
import { replaceDebt } from '../api/replace-debt';

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
      refreshCustomerDebtViews(queryClient, customerId);
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
    createDebt: (request: CreateDebtRequest) => {
      mutation.mutate(request);
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
      refreshCustomerDebtViews(queryClient, customerId);
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
    replaceDebt: (debtId: string, request: ReplaceDebtRequest) => {
      mutation.mutate({ debtId, request });
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
      refreshCustomerDebtViews(queryClient, customerId);
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
    deleteDebt: (debtId: string, description: string) => {
      mutation.mutate({ debtId, description });
    },
    isDeleting: mutation.isPending,
  };
}

function refreshCustomerDebtViews(
  queryClient: QueryClient,
  customerId: string,
) {
  void Promise.all([
    debtCache.invalidateCustomerDebts(queryClient, customerId),
    customerCache.invalidateCustomer(queryClient, customerId),
  ]);
}
