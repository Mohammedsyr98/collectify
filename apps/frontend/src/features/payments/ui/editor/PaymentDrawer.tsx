import * as Dialog from '@radix-ui/react-dialog';
import { zodResolver } from '@hookform/resolvers/zod';
import { CalendarDays, CircleDollarSign, FileText, X } from 'lucide-react';
import { useId, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import type { z } from 'zod';

import { recordPaymentRequestSchema } from '@collectify/contracts';
import type { PaymentTarget } from '@collectify/contracts';
import { formatMoney, parseMoney } from '@collectify/domain/money';
import { validatePayment } from '@collectify/domain/payment';

import { formatCurrencyAmount, formatDateOnly, useLocalization } from '@/shared/localization';
import { FormInput, FormTextarea } from '@/shared/ui/form';
import type { PaymentSubmissionRequest } from '../../api/record-payment';
import { usePaymentValidationErrorFormatter } from '../../localization/usePaymentValidationErrorFormatter';
import { PaymentTargetPicker } from './PaymentTargetPicker';

const paymentFieldsSchema = recordPaymentRequestSchema.pick({
  amount: true,
  paymentDate: true,
  note: true,
});

type PaymentFormInput = z.input<typeof paymentFieldsSchema>;
type PaymentFormOutput = z.output<typeof paymentFieldsSchema>;
type PaymentDrawerScreen =
  | { kind: 'targetPicker'; target?: PaymentTarget }
  | { kind: 'paymentForm'; target: PaymentTarget };

const timingLabelKeys = {
  overdue: 'payments.drawer.timingOverdue',
  dueToday: 'payments.drawer.timingDueToday',
  upcoming: 'payments.drawer.timingUpcoming',
} satisfies Record<PaymentTarget['timing'], string>;

export type PaymentDrawerProps = {
  customerId: string;
  customerName?: string;
  initialTarget?: PaymentTarget;
  onSubmit: (request: PaymentSubmissionRequest) => Promise<void>;
  onClose: () => void;
  returnFocusTarget?: HTMLElement | null;
};

export function PaymentDrawer({
  customerId,
  customerName,
  initialTarget,
  onSubmit,
  onClose,
  returnFocusTarget,
}: PaymentDrawerProps) {
  const { t } = useTranslation();
  const { locale } = useLocalization();
  const formatValidationError = usePaymentValidationErrorFormatter();
  const today = getIstanbulBusinessDate();
  const [screen, setScreen] = useState<PaymentDrawerScreen>(
    initialTarget
      ? { kind: 'paymentForm', target: initialTarget }
      : { kind: 'targetPicker' },
  );
  const formId = useId();
  const amountPreviewId = useId();
  const target = screen.target;
  const formSchema = createPaymentFormSchema(target?.remainingAmount ?? '0.00', today);
  const form = useForm<PaymentFormInput, unknown, PaymentFormOutput>({
    defaultValues: { amount: '', paymentDate: today, note: '' },
    criteriaMode: 'all',
    resolver: zodResolver(formSchema),
  });
  const isSubmitting = form.formState.isSubmitting;

  const requestClose = () => {
    if (!isSubmitting) onClose();
  };

  const submit = form.handleSubmit((values) => {
    if (!target) return;

    return onSubmit({
      ...values,
      expectedDebtVersion: target.debtVersion,
      targetScheduleItemId: target.scheduleItemId,
    });
  });

  const selectTarget = (nextTarget: PaymentTarget) => {
    if (target && target.currency !== nextTarget.currency) {
      form.resetField('amount');
    }
    setScreen({ kind: 'paymentForm', target: nextTarget });
  };

  const preview = getPaymentPreview(form.watch('amount'), target?.remainingAmount);
  const amountHasError = Boolean(form.formState.errors.amount);

  return (
    <Dialog.Root onOpenChange={(open) => !open && requestClose()} open>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-10 bg-foreground/25" />
        <Dialog.Content
          aria-describedby="payment-drawer-description"
          className="fixed inset-y-0 end-0 z-10 grid w-full max-w-[486px] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden border-s border-border bg-card shadow-[var(--shadow-md)]"
          onCloseAutoFocus={(event) => {
            if (returnFocusTarget?.isConnected) {
              event.preventDefault();
              returnFocusTarget.focus();
            }
          }}
        >
          <header className="flex min-h-[84px] items-start justify-between gap-4 border-b border-border px-6 py-5 max-[620px]:min-h-[78px] max-[620px]:px-5 max-[620px]:py-4">
            <Dialog.Title className="sr-only">
              {t('payments.drawer.title')}
            </Dialog.Title>
            <div className="min-w-0">
              <h2 className="m-0 text-base font-black leading-tight tracking-normal">
                {screen.kind === 'targetPicker'
                  ? t('payments.drawer.chooseTargetTitle')
                  : t('payments.drawer.title')}
              </h2>
              {customerName ? (
                <p className="mb-0 mt-1 truncate text-[0.75rem] text-muted-foreground">
                  {customerName}
                </p>
              ) : null}
            </div>
            <button
              aria-label={t('payments.drawer.close')}
              className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-[5px] border border-border bg-background text-muted-foreground transition duration-150 hover:bg-muted hover:text-foreground disabled:cursor-wait disabled:opacity-70"
              disabled={isSubmitting}
              onClick={requestClose}
              type="button"
            >
              <X aria-hidden="true" size={16} strokeWidth={2.5} />
            </button>
          </header>

          <Dialog.Description className="sr-only" id="payment-drawer-description">
            {target
              ? t('payments.drawer.description', { description: target.debtDescription })
              : t('payments.drawer.selectionDescription')}
          </Dialog.Description>

          <main className="min-h-0 overflow-y-auto overscroll-contain">
            {screen.kind === 'targetPicker' ? (
              <PaymentTargetPicker
                customerId={customerId}
                onBack={
                  target
                    ? () => setScreen({ kind: 'paymentForm', target })
                    : undefined
                }
                onSelect={selectTarget}
              />
            ) : (
              <div className="mx-auto grid w-full max-w-[520px] gap-5 px-7 py-[22px] max-[620px]:px-5">
                <SelectedTargetSummary
                  isSubmitting={isSubmitting}
                  locale={locale}
                  onChangeTarget={() =>
                    setScreen({ kind: 'targetPicker', target: screen.target })
                  }
                  target={screen.target}
                />

                <FormProvider {...form}>
                  <form className="grid gap-[13px]" id={formId} noValidate onSubmit={submit}>
                    <div className="grid gap-1.5">
                      <FormInput<PaymentFormInput>
                        aria-describedby={amountHasError ? undefined : amountPreviewId}
                        autoFocus
                        autoComplete="off"
                        dir="ltr"
                        endAdornment={
                          <span className="text-[0.78rem] font-black text-muted-foreground">
                            {screen.target.currency}
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
                      {!amountHasError ? (
                        <div
                          aria-live="polite"
                          className="min-h-[1.05rem] text-[0.76rem] leading-[1.35] text-muted-foreground"
                          id={amountPreviewId}
                        >
                          <span>
                            {t('payments.drawer.targetAfterLabel')}:{' '}
                            {preview ? (
                              <bdi className="font-black text-foreground" dir="ltr">
                                {formatCurrencyAmount(
                                  preview,
                                  screen.target.currency,
                                  locale,
                                )}
                              </bdi>
                            ) : (
                              <>
                                <span aria-hidden="true">—</span>
                                <span className="sr-only">
                                  {t('payments.drawer.previewNotCalculated')}
                                </span>
                              </>
                            )}
                          </span>
                        </div>
                      ) : null}
                    </div>

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
                    <FormTextarea<PaymentFormInput>
                      icon={<FileText aria-hidden="true" size={16} strokeWidth={2.2} />}
                      formatError={formatValidationError}
                      label={t('payments.drawer.noteLabel')}
                      maxLength={500}
                      name="note"
                      placeholder={t('payments.drawer.notePlaceholder')}
                    />
                  </form>
                </FormProvider>
              </div>
            )}
          </main>

          <footer className="grid grid-cols-2 gap-3 border-t border-border bg-card px-5 py-4 max-[430px]:grid-cols-1">
            <button
              className="min-h-11 cursor-pointer rounded-[5px] border border-border bg-background px-[18px] text-[0.84rem] font-extrabold text-foreground transition duration-150 hover:bg-muted disabled:cursor-wait disabled:opacity-70"
              disabled={isSubmitting}
              onClick={requestClose}
              type="button"
            >
              {t('payments.drawer.cancel')}
            </button>
            <button
              className="min-h-11 cursor-pointer rounded-[5px] border-0 bg-primary px-[18px] text-[0.84rem] font-extrabold text-primary-foreground transition duration-150 hover:-translate-y-px hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
              disabled={screen.kind !== 'paymentForm' || isSubmitting}
              form={formId}
              type="submit"
            >
              {isSubmitting ? t('payments.drawer.submitting') : t('payments.drawer.submit')}
            </button>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function SelectedTargetSummary({
  isSubmitting,
  locale,
  onChangeTarget,
  target,
}: {
  isSubmitting: boolean;
  locale: string;
  onChangeTarget: () => void;
  target: PaymentTarget;
}) {
  const { t } = useTranslation();
  const planLabel =
    target.plan.type === 'installment'
      ? t('payments.drawer.installmentLabel', { position: target.plan.position })
      : t('payments.drawer.onePaymentTarget');
  const timingLabel = t(timingLabelKeys[target.timing]);

  return (
    <section className="grid gap-3 rounded-[5px] border border-border bg-background p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[0.72rem] font-black uppercase tracking-wide text-muted-foreground">
          {t('payments.drawer.payingToward')}
        </span>
        <button
          className="cursor-pointer border-0 bg-transparent p-0 text-[0.74rem] font-extrabold text-primary transition hover:underline disabled:cursor-wait disabled:opacity-70"
          disabled={isSubmitting}
          onClick={onChangeTarget}
          type="button"
        >
          {t('payments.drawer.changeTarget')}
        </button>
      </div>
      <div className="grid gap-1">
        <h2 className="m-0 text-[0.95rem] font-black text-foreground">
          {target.debtDescription}
        </h2>
        <p className="m-0 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[0.76rem] font-bold text-muted-foreground">
          <span>{planLabel}</span>
          <span aria-hidden="true">·</span>
          <span>
            {t('payments.drawer.dueDateLabel')} {formatDateOnly(target.dueDate, locale)}
          </span>
          <span aria-hidden="true">·</span>
          {target.timing === 'overdue' ? (
            <span className="inline-flex rounded-[3px] bg-status-overdue-background px-1.5 py-px text-[0.66rem] font-extrabold text-status-overdue-foreground">
              {timingLabel}
            </span>
          ) : (
            <span>{timingLabel}</span>
          )}
        </p>
      </div>
      <div className="flex items-baseline justify-between gap-3 border-t border-border pt-3">
        <span className="text-[0.72rem] font-bold text-muted-foreground">
          {t('payments.drawer.targetRemainingLabel')}
        </span>
        <bdi className="shrink-0 text-lg font-black text-foreground" dir="ltr">
          {formatCurrencyAmount(target.remainingAmount, target.currency, locale)}
        </bdi>
      </div>
    </section>
  );
}

function createPaymentFormSchema(targetRemaining: string, today: string) {
  return paymentFieldsSchema.superRefine(
    (values, context) => {
      const validation = validatePayment({
        amount: values.amount,
        remainingAmount: targetRemaining,
        paymentDate: values.paymentDate,
        businessDate: today,
      });

      if (validation.success) return;

      for (const issue of validation.issues) {
        context.addIssue({
          code: 'custom',
          path: [issue.target],
          message: issue.code,
        });
      }
    },
    {
      when({ value }) {
        return paymentFieldsSchema.safeParse(value).success;
      },
    },
  );
}

function getPaymentPreview(
  amount: string,
  targetRemaining: string | undefined,
): string | undefined {
  const parsedAmount = paymentFieldsSchema.shape.amount.safeParse(amount);
  if (!targetRemaining || !parsedAmount.success) return undefined;

  const paymentAmount = parseMoney(parsedAmount.data);
  const target = parseMoney(targetRemaining);
  if (paymentAmount > target) return undefined;

  return formatMoney(target - paymentAmount);
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
