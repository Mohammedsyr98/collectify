import * as Dialog from '@radix-ui/react-dialog';
import { zodResolver } from '@hookform/resolvers/zod';
import { X } from 'lucide-react';
import { type RefObject } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { createCustomerRequestSchema, type CreateCustomerRequest } from '@collectify/contracts';

import {
  CustomerFormActions,
  CustomerFormFields,
} from './CustomerForm';

const defaultValues: CreateCustomerRequest = {
  name: '',
  code: '',
  phoneNumber: '',
  address: '',
};

export function CustomerCreateModal({
  isSubmitting,
  onClose,
  onSubmit,
  returnFocusRef,
}: {
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (request: CreateCustomerRequest) => Promise<void>;
  returnFocusRef: RefObject<HTMLElement | null>;
}) {
  const { t } = useTranslation();
  const form = useForm<CreateCustomerRequest>({
    defaultValues,
    resolver: zodResolver(createCustomerRequestSchema),
  });

  return (
    <Dialog.Root
      onOpenChange={(open) => {
        if (!open && !isSubmitting) {
          onClose();
        }
      }}
      open
    >
      <Dialog.Portal>
        <Dialog.Overlay
          className="fixed inset-0 z-10 bg-foreground/25"
          data-testid="customer-create-overlay"
        />
        <Dialog.Content
          aria-describedby="customer-create-description"
          className="fixed start-1/2 top-1/2 z-10 grid w-[calc(100%-32px)] max-w-[460px] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-md border border-border bg-card p-5 shadow-[var(--shadow-md)] rtl:translate-x-1/2"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            (event.currentTarget as HTMLElement)
              .querySelector<HTMLInputElement>('input[name="name"]')
              ?.focus();
          }}
          onCloseAutoFocus={(event) => {
            if (!returnFocusRef.current?.isConnected) {
              return;
            }

            event.preventDefault();
            returnFocusRef.current.focus();
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <Dialog.Title className="m-0 text-[1.15rem] font-black leading-tight tracking-normal">
              {t('customers.create.title')}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                aria-label={t('customers.create.close')}
                className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-[5px] border border-border bg-background text-muted-foreground transition duration-150 hover:bg-muted hover:text-foreground disabled:cursor-wait disabled:opacity-70"
                disabled={isSubmitting}
                type="button"
              >
                <X aria-hidden="true" size={16} strokeWidth={2.5} />
              </button>
            </Dialog.Close>
          </div>
          <Dialog.Description
            className="sr-only"
            id="customer-create-description"
          >
            {t('customers.create.description')}
          </Dialog.Description>

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
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
