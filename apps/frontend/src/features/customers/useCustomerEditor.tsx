import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import {
  isCustomerApiErrorCode,
  type CustomerDetailsResponse,
} from '@collectify/contracts';

import { resolveApiErrorDescription } from '../../shared/api/http';
import { useToast } from '../../shared/ui/toast/toastContext';
import { CustomerEditModal } from './CustomerEditModal';
import {
  useCustomerDetailsQuery,
  useUpdateCustomerMutation,
} from './customerQueries';

export type CustomerEditTarget =
  | { customer: CustomerDetailsResponse }
  | { customerId: string };

export type CustomerEditor = {
  dialog: ReactNode;
  open: (
    target: CustomerEditTarget,
    returnFocusTarget: HTMLElement | null,
  ) => void;
  prefetch: (customerId: string) => void;
};

type CustomerEditorSession = {
  returnFocusTarget: HTMLElement | null;
  target: CustomerEditTarget;
};

export function useCustomerEditor(): CustomerEditor {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [session, setSession] = useState<CustomerEditorSession | null>(null);
  const target = session?.target ?? null;
  const customerId = target && 'customerId' in target ? target.customerId : undefined;
  const customerQuery = useCustomerDetailsQuery(customerId);
  const customer = target && 'customer' in target ? target.customer : customerQuery.customer;
  const { isUpdating, updateCustomer } = useUpdateCustomerMutation({
    onUpdated: () => setSession(null),
  });

  useEffect(() => {
    if (
      !customerId ||
      !customerQuery.isError ||
      customerQuery.isFetching
    ) {
      return;
    }

    setSession(null);
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

  const open = useCallback(
    (
      nextTarget: CustomerEditTarget,
      returnFocusTarget: HTMLElement | null,
    ) => {
      setSession((currentSession) =>
        currentSession ?? {
          returnFocusTarget,
          target: nextTarget,
        },
      );
    },
    [],
  );

  let dialog: ReactNode = null;

  if (session) {
    if (!customer) {
      dialog = (
        <CustomerEditModal
          onClose={() => setSession(null)}
          returnFocusTarget={session.returnFocusTarget}
          state="loading"
        />
      );
    } else {
      dialog = (
        <CustomerEditModal
          customer={customer}
          isSubmitting={isUpdating}
          onClose={() => setSession(null)}
          onSubmit={(request) =>
            updateCustomer({
              customerId: customer.id,
              request,
            })
          }
          returnFocusTarget={session.returnFocusTarget}
          state="ready"
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
