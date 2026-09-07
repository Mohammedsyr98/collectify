import { Hash, MapPin, Phone, UserRound } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { FormField } from '../../shared/ui/form/FormField';
import { FormInput } from '../../shared/ui/form/FormInput';
import { useCustomerValidationErrorFormatter } from './localization/useCustomerValidationErrorFormatter';

export type CustomerFormValues = {
  name?: string;
  code?: string;
  phoneNumber?: string;
  address?: string;
};

type CustomerFormActionsProps = {
  isSubmitting: boolean;
  onCancel: () => void;
};

export function CustomerFormFields() {
  const { t } = useTranslation();
  const formatValidationError = useCustomerValidationErrorFormatter();

  return (
    <>
      <FormInput<CustomerFormValues>
        autoComplete="name"
        formatError={formatValidationError}
        icon={<UserRound aria-hidden="true" size={16} strokeWidth={2.2} />}
        label={t('customers.form.nameLabel')}
        name="name"
        placeholder={t('customers.form.namePlaceholder')}
        type="text"
      />
      <FormInput<CustomerFormValues>
        autoComplete="off"
        formatError={formatValidationError}
        icon={<Hash aria-hidden="true" size={16} strokeWidth={2.2} />}
        label={t('customers.form.codeLabel')}
        name="code"
        placeholder={t('customers.form.codePlaceholder')}
        type="text"
      />
      <FormInput<CustomerFormValues>
        autoComplete="tel"
        dir="ltr"
        formatError={formatValidationError}
        icon={<Phone aria-hidden="true" size={16} strokeWidth={2.2} />}
        label={t('customers.form.phoneNumberLabel')}
        name="phoneNumber"
        placeholder={t('customers.form.phoneNumberPlaceholder')}
        type="tel"
      />
      <FormInput<CustomerFormValues>
        autoComplete="street-address"
        formatError={formatValidationError}
        icon={<MapPin aria-hidden="true" size={16} strokeWidth={2.2} />}
        label={t('customers.form.addressLabel')}
        name="address"
        placeholder={t('customers.form.addressPlaceholder')}
        type="text"
      />
    </>
  );
}

export function CustomerFormSkeletonFields() {
  const { t } = useTranslation();

  return (
    <>
      <CustomerFormSkeletonInput
        icon={<UserRound aria-hidden="true" size={16} strokeWidth={2.2} />}
        id="customer-form-skeleton-name"
        label={t('customers.form.nameLabel')}
        skeletonWidthClassName="w-32"
      />
      <CustomerFormSkeletonInput
        icon={<Hash aria-hidden="true" size={16} strokeWidth={2.2} />}
        id="customer-form-skeleton-code"
        label={t('customers.form.codeLabel')}
        skeletonWidthClassName="w-24"
      />
      <CustomerFormSkeletonInput
        icon={<Phone aria-hidden="true" size={16} strokeWidth={2.2} />}
        id="customer-form-skeleton-phone-number"
        label={t('customers.form.phoneNumberLabel')}
        skeletonWidthClassName="w-40"
      />
      <CustomerFormSkeletonInput
        icon={<MapPin aria-hidden="true" size={16} strokeWidth={2.2} />}
        id="customer-form-skeleton-address"
        label={t('customers.form.addressLabel')}
        skeletonWidthClassName="w-36"
      />
    </>
  );
}

function CustomerFormSkeletonInput({
  icon,
  id,
  label,
  skeletonWidthClassName,
}: {
  icon: ReactNode;
  id: string;
  label: string;
  skeletonWidthClassName: string;
}) {
  return (
    <FormField htmlFor={id} icon={icon} label={label}>
      <input
        aria-busy="true"
        className="min-h-10 w-full cursor-wait border-0 bg-transparent px-3.5 py-0 text-transparent outline-none disabled:opacity-100"
        disabled
        id={id}
        readOnly
        type="text"
        value=""
      />
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute start-9 h-3.5 rounded-[4px] bg-muted-foreground/20 motion-safe:animate-pulse ${skeletonWidthClassName}`}
      />
    </FormField>
  );
}

export function CustomerFormActions({
  isSubmitting,
  onCancel,
}: CustomerFormActionsProps) {
  const { t } = useTranslation();

  return (
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
  );
}
