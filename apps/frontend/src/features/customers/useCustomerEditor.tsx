import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import {
  isCustomerApiErrorCode,
  type CustomerDetailsResponse,
} from '@collectify/contracts';

import { resolveApiErrorDescription } from '../../shared/api/http';
import { useToast } from '../../shared/ui/toast/toastContext';
import {
  CustomerEditLoadingModal,
  CustomerEditModal,
} from './CustomerEditModal';
import {
  useCustomerDetailsQuery,
  useUpdateCustomerMutation,
} from './customerQueries';

export type CustomerEditTarget =
  | { customer: CustomerDetailsResponse }
  | { customerId: string };

export type CustomerEditor = {
  dialog: ReactNode;
  open: (target: CustomerEditTarget) => void;
  prefetch: (customerId: string) => void;
};

export function useCustomerEditor(): CustomerEditor {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [target, setTarget] = useState<CustomerEditTarget | null>(null);
  const customerId = target && 'customerId' in target ? target.customerId : undefined;
  const customerQuery = useCustomerDetailsQuery(customerId);
  const customer = target && 'customer' in target ? target.customer : customerQuery.customer;
  const { isUpdating, updateCustomer } = useUpdateCustomerMutation({
    onUpdated: () => setTarget(null),
  });

  useEffect(() => {
    if (
      !customerId ||
      !customerQuery.isError ||
      customerQuery.isFetching
    ) {
      return;
    }

    setTarget(null);
    showToast({
      variant: 'error',
      title: t('customers.toast.editLoad.errorTitle'),
      description: resolveApiErrorDescription(customerQuery.error, {
        describeKnownCode: (code) => t(`customers.errors.${code}`),
        fallbackDescription: t('errors.genericDescription'),
        isKnownCode: isCustomerApiErrorCode,
      }),
    });
  }, [
    customerId,
    customerQuery.error,
    customerQuery.isError,
    customerQuery.isFetching,
    showToast,
    t,
  ]);

  const open = (nextTarget: CustomerEditTarget) => {
    setTarget((currentTarget) =>
      currentTarget === null ? nextTarget : currentTarget,
    );
  };

  let dialog: ReactNode = null;

  if (target) {
    if (!customer) {
      dialog = (
        <CustomerEditLoadingModal onClose={() => setTarget(null)} />
      );
    } else {
      dialog = (
        <CustomerEditModal
          customer={customer}
          isSubmitting={isUpdating}
          onClose={() => setTarget(null)}
          onSubmit={(request) =>
            updateCustomer({
              customerId: customer.id,
              request,
            })
          }
        />
      );
    }
  }

  return {
    dialog,
    open,
    prefetch: customerQuery.prefetch,
  };
}
