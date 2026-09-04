import { zodResolver } from '@hookform/resolvers/zod';
import { X } from 'lucide-react';
import { FormProvider, useForm, type Resolver } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import {
  updateCustomerRequestSchema,
  type CustomerDetailsResponse,
  type UpdateCustomerRequest,
} from '@collectify/contracts';

import {
  CustomerFormActions,
  CustomerFormFields,
  type CustomerFormValues,
} from './CustomerForm';

const updateCustomerFormResolver = zodResolver(
  updateCustomerRequestSchema,
) as Resolver<CustomerFormValues, unknown, UpdateCustomerRequest>;

function getDefaultValues(customer: CustomerDetailsResponse): CustomerFormValues {
  return {
    name: customer.name,
    code: customer.code,
    phoneNumber: customer.phoneNumber,
    address: customer.address ?? '',
  };
}

export function CustomerEditModal({
  customer,
  isSubmitting,
  onClose,
  onSubmit,
}: {
  customer: CustomerDetailsResponse;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (request: UpdateCustomerRequest) => Promise<void>;
}) {
  const { t } = useTranslation();
  const form = useForm<CustomerFormValues, unknown, UpdateCustomerRequest>({
    defaultValues: getDefaultValues(customer),
    resolver: updateCustomerFormResolver,
  });

  return (
    <div
      aria-labelledby="customer-edit-title"
      aria-modal="true"
      className="fixed inset-0 z-10 grid place-items-center bg-foreground/25 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSubmitting) {
          onClose();
        }
      }}
      role="dialog"
    >
      <section className="grid w-full max-w-[460px] gap-4 rounded-md border border-border bg-card p-5 shadow-[var(--shadow-md)]">
        <div className="flex items-center justify-between gap-3">
          <h2
            className="m-0 text-[1.15rem] font-black leading-tight tracking-normal"
            id="customer-edit-title"
          >
            {t('customers.edit.title')}
          </h2>
          <button
            aria-label={t('customers.edit.close')}
            className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-[5px] border border-border bg-background text-muted-foreground transition duration-150 hover:bg-muted hover:text-foreground disabled:cursor-wait disabled:opacity-70"
            disabled={isSubmitting}
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" size={16} strokeWidth={2.5} />
          </button>
        </div>

        <FormProvider {...form}>
          <form
            className="grid gap-[13px]"
            noValidate
            onSubmit={form.handleSubmit((request) => onSubmit(request))}
          >
            <CustomerFormFields />
            <CustomerFormActions isSubmitting={isSubmitting} onCancel={onClose} />
          </form>
        </FormProvider>
      </section>
    </div>
  );
}
