import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';

import {
  isCustomerApiErrorCode,
  type CreateCustomerRequest,
  type CustomerListQuery,
} from '@collectify/contracts';

import { resolveApiErrorDescription } from '../../shared/api/http';
import { useToast } from '../../shared/ui/toast/toastContext';
import { createCustomer } from './api/create-customer';
import { getCustomer } from './api/get-customer';
import { listCustomers } from './api/list-customers';
import {
  updateCustomer,
  type UpdateCustomerOptions,
} from './api/update-customer';

export const customerListQueryKey = ['customers', 'list'] as const;

export const customerListPageQueryKey = (query: CustomerListQuery) =>
  [...customerListQueryKey, query] as const;

export const customerDetailsQueryKey = (customerId: string) =>
  ['customers', customerId] as const;

export function useCustomerListQuery(query: CustomerListQuery) {
  return useQuery({
    queryKey: customerListPageQueryKey(query),
    queryFn: () => listCustomers(query),
    placeholderData: keepPreviousData,
  });
}

export function useCustomerDetailsQuery(customerId: string | undefined) {
  const query = useQuery({
    queryKey: customerDetailsQueryKey(customerId ?? ''),
    queryFn: () => getCustomer(customerId!),
    enabled: Boolean(customerId),
  });
  const customer = query.data?.id === customerId ? query.data : undefined;

  return {
    ...query,
    customer,
    isLoadingCustomer: Boolean(customerId) && !customer && query.isPending,
  };
}

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
      void queryClient.invalidateQueries({ queryKey: customerListQueryKey });
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
      queryClient.setQueryData(customerDetailsQueryKey(customer.id), customer);
      void queryClient.invalidateQueries({ queryKey: customerListQueryKey });
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
