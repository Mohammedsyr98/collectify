import * as Dialog from '@radix-ui/react-dialog';
import { zodResolver } from '@hookform/resolvers/zod';
import { X } from 'lucide-react';
import { useRef } from 'react';
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
  CustomerFormSkeletonFields,
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

type CustomerEditModalProps = {
  onClose: () => void;
  returnFocusTarget?: HTMLElement | null;
} & (
  | {
      state: 'ready';
      customer: CustomerDetailsResponse;
      isSubmitting: boolean;
      onSubmit: (request: UpdateCustomerRequest) => Promise<void>;
    }
  | {
      state: 'loading';
      customer?: never;
      isSubmitting?: never;
      onSubmit?: never;
    }
);

export function CustomerEditModal(props: CustomerEditModalProps) {
  const { t } = useTranslation();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const isSubmitting = props.state === 'ready' ? props.isSubmitting : false;

  return (
    <Dialog.Root
      onOpenChange={(open) => {
        if (!open && !isSubmitting) {
          props.onClose();
        }
      }}
      open
    >
      <Dialog.Portal>
        <Dialog.Overlay
          className="fixed inset-0 z-10 bg-foreground/25"
          data-testid="customer-edit-overlay"
        />
        <Dialog.Content
          aria-describedby="customer-edit-description"
          className="fixed start-1/2 top-1/2 z-10 grid w-[calc(100%-32px)] max-w-[460px] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-md border border-border bg-card p-5 shadow-[var(--shadow-md)] rtl:translate-x-1/2"
          onCloseAutoFocus={(event) => {
            if (!props.returnFocusTarget?.isConnected) {
              return;
            }

            event.preventDefault();
            props.returnFocusTarget.focus();
          }}
          onOpenAutoFocus={(event) => {
            event.preventDefault();

            if (props.state === 'ready') {
              (event.currentTarget as HTMLElement)
                .querySelector<HTMLInputElement>('input[name="name"]')
                ?.focus();
              return;
            }

            closeButtonRef.current?.focus();
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <Dialog.Title className="m-0 text-[1.15rem] font-black leading-tight tracking-normal">
              {t('customers.edit.title')}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                aria-label={t('customers.edit.close')}
                className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-[5px] border border-border bg-background text-muted-foreground transition duration-150 hover:bg-muted hover:text-foreground disabled:cursor-wait disabled:opacity-70"
                disabled={isSubmitting}
                ref={closeButtonRef}
                type="button"
              >
                <X aria-hidden="true" size={16} strokeWidth={2.5} />
              </button>
            </Dialog.Close>
          </div>

          <Dialog.Description
            className="sr-only"
            id="customer-edit-description"
          >
            {t('customers.edit.description')}
          </Dialog.Description>

          {props.state === 'ready' ? (
            <CustomerEditForm
              customer={props.customer}
              isSubmitting={props.isSubmitting}
              onClose={props.onClose}
              onSubmit={props.onSubmit}
            />
          ) : (
            <CustomerEditLoadingBody onClose={props.onClose} />
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function CustomerEditForm({
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
  const form = useForm<CustomerFormValues, unknown, UpdateCustomerRequest>({
    defaultValues: getDefaultValues(customer),
    resolver: updateCustomerFormResolver,
  });

  return (
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
  );
}

function CustomerEditLoadingBody({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();

  return (
    <form aria-busy="true" className="grid gap-[13px]">
      <p className="sr-only" role="status">
        {t('customers.edit.loading')}
      </p>
      <CustomerFormSkeletonFields />
      <div className="grid grid-cols-2 gap-3 max-[430px]:grid-cols-1">
        <button
          className="min-h-11 cursor-pointer rounded-[5px] border border-border bg-background px-[18px] text-[0.84rem] font-extrabold text-foreground transition duration-150 hover:bg-muted"
          onClick={onClose}
          type="button"
        >
          {t('customers.form.cancel')}
        </button>
        <button
          className="min-h-11 cursor-not-allowed rounded-[5px] border-0 bg-primary px-[18px] text-[0.84rem] font-extrabold text-primary-foreground opacity-70"
          disabled
          type="button"
        >
          {t('customers.actions.save')}
        </button>
      </div>
    </form>
  );
}
