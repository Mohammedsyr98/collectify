import * as Dialog from '@radix-ui/react-dialog';
import { zodResolver } from '@hookform/resolvers/zod';
import { CalendarDays, CircleDollarSign, FileText, X } from 'lucide-react';
import { useId, type RefObject } from 'react';
import { FormProvider, useController, useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import {
  paymentApiErrorCode,
  recordPaymentRequestSchema,
} from '@collectify/contracts';
import type { DebtResponse } from '@collectify/contracts';
import { formatMoney, parseMoney } from '@collectify/domain/money';

import { formatCurrencyAmount, useLocalization } from '../../../shared/localization';
import { FormField } from '../../../shared/ui/form/FormField';
import { FormInput } from '../../../shared/ui/form/FormInput';
import type { PaymentSubmissionRequest } from '../api/record-payment';
import { usePaymentValidationErrorFormatter } from '../localization/usePaymentValidationErrorFormatter';

const paymentFieldsSchema = recordPaymentRequestSchema
  .pick({ amount: true, paymentDate: true, note: true });

type PaymentFormInput = z.input<typeof paymentFieldsSchema>;

type PaymentFormOutput = z.output<typeof paymentFieldsSchema>;

export type PaymentDrawerProps = {
  debt: DebtResponse;
  targetScheduleItemId: string;
  onSubmit: (
    request: PaymentSubmissionRequest,
  ) => Promise<void>;
  onClose: () => void;
  returnFocusRef?: RefObject<HTMLElement | null>;
};

export function PaymentDrawer({
  debt,
  targetScheduleItemId,
  onSubmit,
  onClose,
  returnFocusRef,
}: PaymentDrawerProps) {
  const { t } = useTranslation();
  const { locale } = useLocalization();
  const formatValidationError = usePaymentValidationErrorFormatter();
  const today = getIstanbulBusinessDate();
  const target = debt.scheduleItems.find(
    ({ id }) => id === targetScheduleItemId,
  );
  const formSchema = createPaymentFormSchema(target?.remainingAmount ?? '0.00', today);
  const form = useForm<PaymentFormInput, unknown, PaymentFormOutput>({
    defaultValues: {
      amount: '',
      paymentDate: today,
      note: '',
    },
    criteriaMode: 'all',
    resolver: zodResolver(formSchema),
  });
  const amount = useWatch({ control: form.control, name: 'amount' });
  const isSubmitting = form.formState.isSubmitting;
  const noteId = useId();
  const noteField = useController({ control: form.control, name: 'note' });
  const noteError = noteField.fieldState.error?.message;

  const requestClose = () => {
    if (isSubmitting) {
      return;
    }

    onClose();
  };

  const submit = form.handleSubmit(async (values) => {
    if (!target) {
      return;
    }

    try {
      await onSubmit({
        ...values,
        expectedDebtVersion: debt.version,
        targetScheduleItemId,
      });
    } catch {
      return;
    }
  });

  const preview = getPaymentPreview(amount, target?.remainingAmount, debt.remainingAmount);
  const targetLabel = target
    ? debt.paymentPlanType === 'installment'
      ? `${t('payments.drawer.targetLabel')} · ${target.position}`
      : t('payments.drawer.onePaymentTarget')
    : t('payments.drawer.targetLabel');

  return (
    <Dialog.Root
      onOpenChange={(open) => {
        if (!open) {
          requestClose();
        }
      }}
      open
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-10 bg-foreground/25" />
        <Dialog.Content
          aria-describedby="payment-drawer-description"
          className="fixed inset-y-0 end-0 z-10 grid w-full max-w-[460px] content-start gap-4 overflow-y-auto border-s border-border bg-card p-5 shadow-[var(--shadow-md)]"
          onEscapeKeyDown={(event) => {
            if (isSubmitting) {
              event.preventDefault();
              requestClose();
            }
          }}
          onInteractOutside={(event) => {
            if (isSubmitting) {
              event.preventDefault();
              requestClose();
            }
          }}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            (event.currentTarget as HTMLElement)
              .querySelector<HTMLInputElement>('input[name="amount"]')
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
              {t('payments.drawer.title')}
            </Dialog.Title>
            <button
              aria-label={t('payments.drawer.close')}
              className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-[5px] border border-border bg-background text-muted-foreground transition duration-150 hover:bg-muted hover:text-foreground disabled:cursor-wait disabled:opacity-70"
              disabled={isSubmitting}
              onClick={requestClose}
              type="button"
            >
              <X aria-hidden="true" size={16} strokeWidth={2.5} />
            </button>
          </div>
          <Dialog.Description
            className="sr-only"
            id="payment-drawer-description"
          >
            {t('payments.drawer.description', { description: debt.description })}
          </Dialog.Description>

          {!target ? (
            <p className="m-0 text-[0.8rem] font-bold text-status-overdue-foreground" role="alert">
              {t('payments.drawer.targetUnavailable')}
            </p>
          ) : (
            <>
              <div className="grid gap-2 rounded-[5px] border border-border bg-background p-3">
                <div className="flex items-center justify-between gap-3 text-[0.78rem] font-bold text-muted-foreground">
                  <span>{targetLabel}</span>
                  <bdi className="font-black text-foreground" dir="ltr">
                    {formatCurrencyAmount(target.amount, debt.currency, locale)}
                  </bdi>
                </div>
                <div className="grid grid-cols-2 gap-3 border-t border-border pt-2">
                  <PaymentMetric
                    currency={debt.currency}
                    label={t('payments.drawer.targetRemainingLabel')}
                    locale={locale}
                    value={target.remainingAmount}
                  />
                  <PaymentMetric
                    currency={debt.currency}
                    label={t('payments.drawer.debtRemainingLabel')}
                    locale={locale}
                    value={debt.remainingAmount}
                  />
                </div>
              </div>

              <FormProvider {...form}>
                <form className="grid gap-[13px]" noValidate onSubmit={submit}>
                  <FormInput<PaymentFormInput>
                    autoComplete="off"
                    dir="ltr"
                    endAdornment={
                      <span className="text-[0.78rem] font-black text-muted-foreground">
                      {debt.currency}
                      </span>
                    }
                    icon={<CircleDollarSign aria-hidden="true" size={16} strokeWidth={2.2} />}
                    label={t('payments.drawer.amountLabel')}
                    name="amount"
                    placeholder={t('payments.drawer.amountPlaceholder')}
                    type="text"
                    inputMode="decimal"
                    formatError={formatValidationError}
                  />
                  <button
                    className="min-h-9 cursor-pointer rounded-[5px] border border-border bg-background px-3 text-[0.76rem] font-extrabold text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isSubmitting || target.remainingAmount === '0.00'}
                    onClick={() => {
                      form.setValue('amount', target.remainingAmount, {
                        shouldDirty: true,
                        shouldValidate: true,
                      });
                    }}
                    type="button"
                  >
                    {t('payments.drawer.payFull')}
                  </button>
                  <FormInput<PaymentFormInput>
                    autoComplete="off"
                    dir="ltr"
                    icon={<CalendarDays aria-hidden="true" size={16} strokeWidth={2.2} />}
                    label={t('payments.drawer.dateLabel')}
                    max={today}
                    name="paymentDate"
                    type="date"
                    formatError={formatValidationError}
                  />
                  <FormField
                    error={noteError}
                    formatError={formatValidationError}
                    htmlFor={noteId}
                    icon={<FileText aria-hidden="true" size={16} strokeWidth={2.2} />}
                    label={t('payments.drawer.noteLabel')}
                  >
                    <textarea
                      {...noteField.field}
                      aria-describedby={noteError ? `${noteId}-error` : undefined}
                      className="min-h-20 w-full resize-y border-0 bg-transparent px-3.5 py-2.5 text-foreground outline-none placeholder:text-muted-foreground/70"
                      id={noteId}
                      maxLength={500}
                      placeholder={t('payments.drawer.notePlaceholder')}
                      value={noteField.field.value ?? ''}
                    />
                  </FormField>

                  {preview ? (
                    <div className="grid gap-2 rounded-[5px] border border-border bg-muted/40 p-3">
                      <h2 className="m-0 text-[0.78rem] font-black text-foreground">
                        {t('payments.drawer.previewTitle')}
                      </h2>
                      <div className="grid grid-cols-2 gap-3">
                        <PaymentMetric
                          currency={debt.currency}
                          label={t('payments.drawer.targetAfterLabel')}
                          locale={locale}
                          value={preview.targetRemaining}
                        />
                        <PaymentMetric
                          currency={debt.currency}
                          label={t('payments.drawer.debtAfterLabel')}
                          locale={locale}
                          value={preview.debtRemaining}
                        />
                      </div>
                    </div>
                  ) : null}

                  <div className="grid grid-cols-2 gap-3 max-[430px]:grid-cols-1">
                    <button
                      className="min-h-11 cursor-pointer rounded-[5px] border border-border bg-background px-[18px] text-[0.84rem] font-extrabold text-foreground transition duration-150 hover:bg-muted disabled:cursor-wait disabled:opacity-70"
                      disabled={isSubmitting}
                      onClick={requestClose}
                      type="button"
                    >
                      {t('payments.drawer.cancel')}
                    </button>
                    <button
                      className="min-h-11 cursor-pointer rounded-[5px] border-0 bg-primary px-[18px] text-[0.84rem] font-extrabold text-primary-foreground transition duration-150 hover:-translate-y-px hover:brightness-95 disabled:cursor-wait disabled:opacity-70 disabled:hover:translate-y-0"
                      disabled={isSubmitting}
                      type="submit"
                    >
                      {isSubmitting
                        ? t('payments.drawer.submitting')
                        : t('payments.drawer.submit')}
                    </button>
                  </div>
                </form>
              </FormProvider>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function createPaymentFormSchema(targetRemaining: string, today: string) {
  return paymentFieldsSchema.extend({
    amount: paymentFieldsSchema.shape.amount.pipe(
      z.string().refine(
        (amount) => parseMoney(amount) <= parseMoney(targetRemaining),
        paymentApiErrorCode.paymentAmountExceedsRemaining,
      ),
    ),
    paymentDate: paymentFieldsSchema.shape.paymentDate.pipe(
      z.string().refine(
        (paymentDate) => paymentDate <= today,
        paymentApiErrorCode.paymentDateInFuture,
      ),
    ),
  });
}

function getPaymentPreview(
  amount: string,
  targetRemaining: string | undefined,
  debtRemaining: string,
) {
  const parsedAmount = paymentFieldsSchema.shape.amount.safeParse(amount);

  if (!targetRemaining || !parsedAmount.success) {
    return undefined;
  }

  const paymentAmount = parseMoney(parsedAmount.data);
  const target = parseMoney(targetRemaining);
  const debt = parseMoney(debtRemaining);

  if (paymentAmount > target || paymentAmount > debt) {
    return undefined;
  }

  return {
    targetRemaining: formatMoney(target - paymentAmount),
    debtRemaining: formatMoney(debt - paymentAmount),
  };
}

function getIstanbulBusinessDate(at = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Istanbul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(at);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));

  return `${values.year}-${values.month}-${values.day}`;
}

function PaymentMetric({
  currency,
  label,
  locale,
  value,
}: {
  currency: DebtResponse['currency'];
  label: string;
  locale: string;
  value: string;
}) {
  return (
    <div className="grid gap-1">
      <span className="text-[0.68rem] font-black text-muted-foreground">{label}</span>
      <bdi className="text-[0.9rem] font-black" dir="ltr">
        {formatCurrencyAmount(value, currency, locale)}
      </bdi>
    </div>
  );
}
