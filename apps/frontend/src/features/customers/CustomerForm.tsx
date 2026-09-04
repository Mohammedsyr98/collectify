import { Hash, MapPin, Phone, UserRound } from 'lucide-react';
import {
  FormProvider,
  type FieldValues,
  type Resolver,
  useForm,
} from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { FormInput } from '../../shared/ui/form/FormInput';
import { useCustomerValidationErrorFormatter } from './localization/useCustomerValidationErrorFormatter';

export type CustomerFormValues = {
  name: string;
  code: string;
  phoneNumber: string;
  address?: string;
};

type CustomerFormProps<TSubmitRequest extends FieldValues> = {
  defaultValues: CustomerFormValues;
  isSubmitting: boolean;
  onCancel: () => void;
  onSubmit: (request: TSubmitRequest) => Promise<void>;
  resolver: Resolver<CustomerFormValues, unknown, TSubmitRequest>;
};

export function CustomerForm<TSubmitRequest extends FieldValues>({
  defaultValues,
  isSubmitting,
  onCancel,
  onSubmit,
  resolver,
}: CustomerFormProps<TSubmitRequest>) {
  const { t } = useTranslation();
  const formatValidationError = useCustomerValidationErrorFormatter();
  const form = useForm<CustomerFormValues, unknown, TSubmitRequest>({
    defaultValues,
    resolver,
  });

  return (
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
          label={t('customers.form.nameLabel')}
          name="name"
          placeholder={t('customers.form.namePlaceholder')}
          type="text"
        />
        <FormInput
          autoComplete="off"
          formatError={formatValidationError}
          icon={<Hash aria-hidden="true" size={16} strokeWidth={2.2} />}
          label={t('customers.form.codeLabel')}
          name="code"
          placeholder={t('customers.form.codePlaceholder')}
          type="text"
        />
        <FormInput
          autoComplete="tel"
          dir="ltr"
          formatError={formatValidationError}
          icon={<Phone aria-hidden="true" size={16} strokeWidth={2.2} />}
          label={t('customers.form.phoneNumberLabel')}
          name="phoneNumber"
          placeholder={t('customers.form.phoneNumberPlaceholder')}
          type="tel"
        />
        <FormInput
          autoComplete="street-address"
          formatError={formatValidationError}
          icon={<MapPin aria-hidden="true" size={16} strokeWidth={2.2} />}
          label={t('customers.form.addressLabel')}
          name="address"
          placeholder={t('customers.form.addressPlaceholder')}
          type="text"
        />

        <div className="grid grid-cols-2 gap-3 max-[430px]:grid-cols-1">
          <button
            className="min-h-11 cursor-pointer rounded-[5px] border border-border bg-background px-[18px] text-[0.84rem] font-extrabold text-foreground transition duration-150 hover:bg-muted disabled:cursor-wait disabled:opacity-70"
            disabled={isSubmitting}
            onClick={onCancel}
            type="button"
          >
            {t('customers.form.cancel')}
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
  );
}
