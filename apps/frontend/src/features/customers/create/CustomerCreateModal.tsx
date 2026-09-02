import { zodResolver } from '@hookform/resolvers/zod';
import { Hash, MapPin, Phone, UserRound, X } from 'lucide-react';
import { FormProvider, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { createCustomerRequestSchema, type CreateCustomerRequest } from '@collectify/contracts';

import { FormInput } from '../../../shared/ui/form/FormInput';
import { useCustomerValidationErrorFormatter } from '../localization/useCustomerValidationErrorFormatter';

type CustomerCreateFormValues = {
  name: string;
  code: string;
  phoneNumber: string;
  address?: string;
};

const defaultValues: CustomerCreateFormValues = {
  name: '',
  code: '',
  phoneNumber: '',
  address: '',
};

export function CustomerCreateModal({
  isSubmitting,
  onClose,
  onSubmit,
}: {
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (request: CreateCustomerRequest) => Promise<void>;
}) {
  const { t } = useTranslation();
  const formatValidationError = useCustomerValidationErrorFormatter();
  const form = useForm<CustomerCreateFormValues, unknown, CreateCustomerRequest>({
    defaultValues,
    resolver: zodResolver(createCustomerRequestSchema),
  });

  return (
    <div
      aria-labelledby="customer-create-title"
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
            id="customer-create-title"
          >
            {t('customers.create.title')}
          </h2>
          <button
            aria-label={t('customers.create.close')}
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
            <FormInput
              autoComplete="name"
              formatError={formatValidationError}
              icon={<UserRound aria-hidden="true" size={16} strokeWidth={2.2} />}
              label={t('customers.create.nameLabel')}
              name="name"
              placeholder={t('customers.create.namePlaceholder')}
              type="text"
            />
            <FormInput
              autoComplete="off"
              formatError={formatValidationError}
              icon={<Hash aria-hidden="true" size={16} strokeWidth={2.2} />}
              label={t('customers.create.codeLabel')}
              name="code"
              placeholder={t('customers.create.codePlaceholder')}
              type="text"
            />
            <FormInput
              autoComplete="tel"
              dir="ltr"
              formatError={formatValidationError}
              icon={<Phone aria-hidden="true" size={16} strokeWidth={2.2} />}
              label={t('customers.create.phoneNumberLabel')}
              name="phoneNumber"
              placeholder={t('customers.create.phoneNumberPlaceholder')}
              type="tel"
            />
            <FormInput
              autoComplete="street-address"
              formatError={formatValidationError}
              icon={<MapPin aria-hidden="true" size={16} strokeWidth={2.2} />}
              label={t('customers.create.addressLabel')}
              name="address"
              placeholder={t('customers.create.addressPlaceholder')}
              type="text"
            />

            <div className="grid grid-cols-2 gap-3 max-[430px]:grid-cols-1">
              <button
                className="min-h-11 cursor-pointer rounded-[5px] border border-border bg-background px-[18px] text-[0.84rem] font-extrabold text-foreground transition duration-150 hover:bg-muted disabled:cursor-wait disabled:opacity-70"
                disabled={isSubmitting}
                onClick={onClose}
                type="button"
              >
                {t('customers.create.cancel')}
              </button>
              <button
                className="min-h-11 cursor-pointer rounded-[5px] border-0 bg-primary px-[18px] text-[0.84rem] font-extrabold text-primary-foreground transition duration-150 hover:-translate-y-px hover:brightness-95 disabled:cursor-wait disabled:opacity-70 disabled:hover:translate-y-0"
                disabled={isSubmitting}
                type="submit"
              >
                {isSubmitting ? t('customers.actions.saving') : t('customers.actions.save')}
              </button>
            </div>
          </form>
        </FormProvider>
      </section>
    </div>
  );
}
