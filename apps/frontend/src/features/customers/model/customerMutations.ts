import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';

import {
  isCustomerApiErrorCode,
  type CreateCustomerRequest,
} from '@collectify/contracts';

import { customerCache } from '@/entities/customer';
import { resolveApiErrorDescription } from '@/shared/api';
import { useToast } from '@/shared/ui/toast';

import { createCustomer } from '../api/create-customer';
import {
  updateCustomer,
  type UpdateCustomerOptions,
} from '../api/update-customer';

export function useCreateCustomerMutation({
  onCreated,
}: {
  onCreated?: () => void;
} = {}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const { showToast } = useToast();

  const mutation = useMutation({
    mutationFn: createCustomer,
    onSuccess: (customer) => {
      void customerCache.synchronize(queryClient, customer);
      showToast({
        variant: 'success',
        title: t('customers.toast.create.successTitle'),
        description: t('customers.toast.create.successDescription', {
          name: customer.name,
        }),
      });
      onCreated?.();
      void navigate(`/customers/${customer.id}`);
    },
    onError: (error) => {
      showToast({
        variant: 'error',
        title: t('customers.toast.create.errorTitle'),
        description: resolveApiErrorDescription(error, {
          describeKnownCode: (code) => t(`customers.errors.${code}`),
          fallbackDescription: t('errors.genericDescription'),
          isKnownCode: isCustomerApiErrorCode,
        }),
      });
    },
  });

  return {
    createCustomer: async (request: CreateCustomerRequest) => {
      try {
        await mutation.mutateAsync(request);
      } catch {
        // Error presentation is handled by the mutation toast path.
      }
    },
    isCreating: mutation.isPending,
  };
}

export function useUpdateCustomerMutation({
  onUpdated,
}: {
  onUpdated?: () => void;
} = {}) {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const { showToast } = useToast();

  const mutation = useMutation({
    mutationFn: updateCustomer,
    onSuccess: (customer) => {
      void customerCache.synchronize(queryClient, customer);
      showToast({
        variant: 'success',
        title: t('customers.toast.update.successTitle'),
        description: t('customers.toast.update.successDescription', {
          name: customer.name,
        }),
      });
      onUpdated?.();
    },
    onError: (error) => {
      showToast({
        variant: 'error',
        title: t('customers.toast.update.errorTitle'),
        description: resolveApiErrorDescription(error, {
          describeKnownCode: (code) => t(`customers.errors.${code}`),
          fallbackDescription: t('errors.genericDescription'),
          isKnownCode: isCustomerApiErrorCode,
        }),
      });
    },
  });

  return {
    updateCustomer: async (options: UpdateCustomerOptions) => {
      try {
        await mutation.mutateAsync(options);
      } catch {
        // Error presentation is handled by the mutation toast path.
      }
    },
    isUpdating: mutation.isPending,
  };
}
