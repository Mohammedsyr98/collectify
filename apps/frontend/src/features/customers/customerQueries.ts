import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';

import {
  isCustomerApiErrorCode,
  type CreateCustomerRequest,
} from '@collectify/contracts';

import { resolveApiErrorDescription } from '../../shared/api/http';
import { useToast } from '../../shared/ui/toast/toastContext';
import { createCustomer } from './api/create-customer';
import { getCustomer } from './api/get-customer';

export const customerDetailsQueryKey = (customerId: string) =>
  ['customers', customerId] as const;

export function useCustomerDetailsQuery(customerId: string | undefined) {
  return useQuery({
    queryKey: customerDetailsQueryKey(customerId ?? ''),
    queryFn: () => getCustomer(customerId!),
    enabled: Boolean(customerId),
  });
}

export function useCreateCustomerMutation({
  onCreated,
}: {
  onCreated?: () => void;
} = {}) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { showToast } = useToast();

  const mutation = useMutation({
    mutationFn: createCustomer,
    onSuccess: (customer) => {
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
