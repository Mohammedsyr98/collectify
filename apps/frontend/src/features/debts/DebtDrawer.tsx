import * as Dialog from '@radix-ui/react-dialog';
import { CircleDollarSign, FileText, X } from 'lucide-react';
import { type RefObject } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import type {
  DebtResponse,
  CreateDebtRequest,
  ReplaceDebtRequest,
  Currency,
} from '@collectify/contracts';

import { FormInput } from '../../shared/ui/form/FormInput';
import { FormSelect } from '../../shared/ui/form/FormSelect';
import { useDebtValidationErrorFormatter } from './localization/useDebtValidationErrorFormatter';
import { DebtPlanFields } from './DebtPlanFields';
import {
  createDebtDraft,
  debtDraftResolver,
  type DebtDraft,
} from './debt-draft';

type DebtDrawerProps = {
  isSubmitting: boolean;
  onClose: () => void;
  returnFocusRef?: RefObject<HTMLElement | null>;
} & (
  | {
      debt?: never;
      mode?: 'create';
      defaultCurrency: Currency;
      onSubmit: (request: CreateDebtRequest) => Promise<void>;
    }
  | {
      debt: DebtResponse;
      mode: 'edit';
      defaultCurrency?: never;
      onSubmit: (request: ReplaceDebtRequest) => Promise<void>;
    }
);

export function DebtDrawer(props: DebtDrawerProps) {
  const { isSubmitting, mode = 'create', onClose, returnFocusRef } = props;
  const { t } = useTranslation();
  const formatValidationError = useDebtValidationErrorFormatter();
  const form = useForm<DebtDraft, unknown, CreateDebtRequest>({
    defaultValues: createDebtDraft(
      props.mode === 'edit'
        ? { debt: props.debt, mode: 'edit' }
        : { defaultCurrency: props.defaultCurrency, mode: 'create' },
    ),
    resolver: debtDraftResolver,
    shouldUnregister: false,
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
        <Dialog.Overlay className="fixed inset-0 z-10 bg-foreground/25" />
        <Dialog.Content
          aria-describedby="debt-drawer-description"
          className="fixed inset-y-0 end-0 z-10 grid w-full max-w-[460px] content-start gap-4 overflow-y-auto border-s border-border bg-card p-5 shadow-[var(--shadow-md)]"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            (event.currentTarget as HTMLElement)
              .querySelector<HTMLInputElement>('input[name="description"]')
              ?.focus();
          }}
          onCloseAutoFocus={(event) => {
            if (!returnFocusRef?.current) {
              return;
            }

            event.preventDefault();
            returnFocusRef.current.focus();
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <Dialog.Title className="m-0 text-[1.15rem] font-black leading-tight tracking-normal">
              {t(
                mode === 'edit'
                  ? 'debts.drawer.editTitle'
                  : 'debts.drawer.createTitle',
              )}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                aria-label={t('debts.drawer.close')}
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
            id="debt-drawer-description"
          >
            {t(
              mode === 'edit'
                ? 'debts.drawer.editDescription'
                : 'debts.drawer.description',
            )}
          </Dialog.Description>

          <FormProvider {...form}>
            <form
              className="grid gap-[13px]"
              noValidate
              onSubmit={form.handleSubmit((request) => {
                if (props.mode === 'edit') {
                  return props.onSubmit({
                    ...request,
                    scheduleItems: [
                      {
                        ...request.scheduleItems[0],
                        id: props.debt.scheduleItems[0].id,
                      },
                    ],
                  });
                }

                return props.onSubmit(request);
              })}
            >
              <FormInput<DebtDraft>
                autoComplete="off"
                icon={<FileText aria-hidden="true" size={16} strokeWidth={2.2} />}
                label={t('debts.form.descriptionLabel')}
                name="description"
                placeholder={t('debts.form.descriptionPlaceholder')}
                type="text"
                formatError={formatValidationError}
              />
              <FormInput<DebtDraft>
                autoComplete="off"
                icon={
                  <CircleDollarSign
                    aria-hidden="true"
                    size={16}
                    strokeWidth={2.2}
                  />
                }
                label={t('debts.form.totalAmountLabel')}
                name="totalAmount"
                placeholder={t('debts.form.totalAmountPlaceholder')}
                type="text"
                inputMode="decimal"
                formatError={formatValidationError}
              />
              <FormSelect<DebtDraft>
                icon={<CircleDollarSign aria-hidden="true" size={16} strokeWidth={2.2} />}
                label={t('debts.form.currencyLabel')}
                name="currency"
                options={[
                  { label: 'TRY', value: 'TRY' },
                  { label: 'USD', value: 'USD' },
                  { label: 'EUR', value: 'EUR' },
                ]}
                formatError={formatValidationError}
              />
              <DebtPlanFields
                disabled={isSubmitting}
                formatError={formatValidationError}
                mode={mode}
              />
              {form.formState.errors.root?.message ? (
                <p
                  className="m-0 text-[0.72rem] font-bold leading-[1.35] text-status-overdue-foreground"
                  role="alert"
                >
                  {formatValidationError(form.formState.errors.root.message)}
                </p>
              ) : null}
              <div className="grid grid-cols-2 gap-3 max-[430px]:grid-cols-1">
                <Dialog.Close asChild>
                  <button
                    className="min-h-11 cursor-pointer rounded-[5px] border border-border bg-background px-[18px] text-[0.84rem] font-extrabold text-foreground transition duration-150 hover:bg-muted"
                    disabled={isSubmitting}
                    type="button"
                  >
                    {t('debts.form.cancel')}
                  </button>
                </Dialog.Close>
                <button
                  className="min-h-11 cursor-pointer rounded-[5px] border-0 bg-primary px-[18px] text-[0.84rem] font-extrabold text-primary-foreground transition duration-150 hover:-translate-y-px hover:brightness-95 disabled:cursor-wait disabled:opacity-70 disabled:hover:translate-y-0"
                  disabled={isSubmitting}
                  type="submit"
                >
                  {isSubmitting ? t('debts.form.saving') : t('debts.form.save')}
                </button>
              </div>
            </form>
          </FormProvider>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
