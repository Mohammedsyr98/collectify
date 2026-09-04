import { zodResolver } from '@hookform/resolvers/zod';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { createCustomerRequestSchema, type CreateCustomerRequest } from '@collectify/contracts';

import {
  CustomerForm,
  type CustomerFormValues,
} from './CustomerForm';

const defaultValues: CustomerFormValues = {
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

        <CustomerForm
          defaultValues={defaultValues}
          isSubmitting={isSubmitting}
          onCancel={onClose}
          onSubmit={onSubmit}
          resolver={zodResolver(createCustomerRequestSchema)}
        />
      </section>
    </div>
  );
}
