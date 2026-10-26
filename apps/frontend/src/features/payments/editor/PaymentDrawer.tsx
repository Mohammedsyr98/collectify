import * as Dialog from '@radix-ui/react-dialog';
import { zodResolver } from '@hookform/resolvers/zod';
import { CalendarDays, CircleDollarSign, FileText, X } from 'lucide-react';
import { useEffect, useId, useState, type RefObject } from 'react';
import { FormProvider, useController, useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import { paymentApiErrorCode, recordPaymentRequestSchema } from '@collectify/contracts';
import type { EligiblePaymentState, PaymentTarget } from '@collectify/contracts';
import { formatMoney, parseMoney } from '@collectify/domain/money';

import {
  formatCurrencyAmount,
  formatDateOnly,
  useLocalization,
} from '../../../shared/localization';
import { FormField } from '../../../shared/ui/form/FormField';
import { FormInput } from '../../../shared/ui/form/FormInput';
import { useDebouncedValue } from '../../../shared/useDebouncedValue';
import type { PaymentSubmissionRequest } from '../api/record-payment';
import { usePaymentValidationErrorFormatter } from '../localization/usePaymentValidationErrorFormatter';
import { usePaymentTargetListQuery } from '../paymentTargetQueries';

const paymentFieldsSchema = recordPaymentRequestSchema.pick({
  amount: true,
  paymentDate: true,
  note: true,
});

const paymentTargetSkeletonCards = [0, 1, 2];

type PaymentPreview = { status: 'available'; targetRemaining: string } | { status: 'unavailable' };

type PaymentFormInput = z.input<typeof paymentFieldsSchema>;

type PaymentFormOutput = z.output<typeof paymentFieldsSchema>;

type PaymentTargetStatusFilter = '' | EligiblePaymentState;

export type PaymentDrawerProps = {
  customerId: string;
  initialTarget?: PaymentTarget;
  onSubmit: (request: PaymentSubmissionRequest) => Promise<void>;
  onClose: () => void;
  returnFocusRef?: RefObject<HTMLElement | null>;
};

export function PaymentDrawer({
  customerId,
  initialTarget,
  onSubmit,
  onClose,
  returnFocusRef,
}: PaymentDrawerProps) {
  const { t } = useTranslation();
  const { locale } = useLocalization();
  const formatValidationError = usePaymentValidationErrorFormatter();
  const today = getIstanbulBusinessDate();
  const [target, setTarget] = useState(initialTarget);
  const [view, setView] = useState<'form' | 'selection'>(initialTarget ? 'form' : 'selection');
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
        expectedDebtVersion: target.debtVersion,
        targetScheduleItemId: target.scheduleItemId,
      });
    } catch {
      return;
    }
  });

  const preview = getPaymentPreview(amount, target?.remainingAmount);
  const targetLabel = target
    ? target.plan.type === 'installment'
      ? `${t('payments.drawer.targetLabel')} · ${target.plan.position}`
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
          <Dialog.Description className="sr-only" id="payment-drawer-description">
            {t('payments.drawer.description', {
              description: target?.debtDescription ?? '',
            })}
          </Dialog.Description>

          {view === 'selection' ? (
            <PaymentTargetSelection
              customerId={customerId}
              onSelect={(nextTarget) => {
                if (target && target.currency !== nextTarget.currency) {
                  form.setValue('amount', '', {
                    shouldDirty: true,
                    shouldValidate: false,
                  });
                  form.clearErrors('amount');
                }

                setTarget(nextTarget);
                setView('form');
              }}
            />
          ) : !target ? (
            <p className="m-0 text-[0.8rem] font-bold text-status-overdue-foreground" role="alert">
              {t('payments.drawer.targetUnavailable')}
            </p>
          ) : (
            <>
              <div className="grid gap-2 rounded-[5px] border border-border bg-background p-3">
                <div className="flex items-center justify-between gap-3 text-[0.78rem] font-bold text-muted-foreground">
                  <span>{targetLabel}</span>
                  <div className="flex items-center gap-2">
                    <bdi className="font-black text-foreground" dir="ltr">
                      {formatCurrencyAmount(target.amount, target.currency, locale)}
                    </bdi>
                    <button
                      className="cursor-pointer rounded-[5px] border border-border bg-card px-2 py-1 text-[0.72rem] font-extrabold text-foreground transition hover:bg-muted disabled:cursor-wait disabled:opacity-70"
                      disabled={isSubmitting}
                      onClick={() => setView('selection')}
                      type="button"
                    >
                      {t('payments.drawer.changeTarget')}
                    </button>
                  </div>
                </div>
                <div className="grid gap-3 border-t border-border pt-2">
                  <PaymentMetric
                    currency={target.currency}
                    label={t('payments.drawer.targetRemainingLabel')}
                    locale={locale}
                    value={target.remainingAmount}
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
                        {target.currency}
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
                      {preview.status === 'available' ? (
                        <div className="grid gap-3">
                          <PaymentMetric
                            currency={target.currency}
                            label={t('payments.drawer.targetAfterLabel')}
                            locale={locale}
                            value={preview.targetRemaining}
                          />
                        </div>
                      ) : (
                        <p
                          aria-live="polite"
                          className="m-0 text-[0.78rem] font-bold text-status-overdue-foreground"
                          role="status"
                        >
                          {t('payments.drawer.previewUnavailable')}
                        </p>
                      )}
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
                      {isSubmitting ? t('payments.drawer.submitting') : t('payments.drawer.submit')}
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

function PaymentTargetSelection({
  customerId,
  onSelect,
}: {
  customerId: string;
  onSelect: (target: PaymentTarget) => void;
}) {
  const { t } = useTranslation();
  const [rawSearch, setRawSearch] = useState('');
  const effectiveSearch = useDebouncedValue(rawSearch.trim());
  const [paymentState, setPaymentState] = useState<PaymentTargetStatusFilter>('');
  const [page, setPage] = useState(1);
  const [pickerMode, setPickerMode] = useState<'unknown' | 'simple' | 'large'>('unknown');

  const targetQuery = usePaymentTargetListQuery(customerId, {
    page,
    ...(effectiveSearch ? { search: effectiveSearch } : {}),
    ...(paymentState ? { paymentState } : {}),
  });

  useEffect(() => {
    if (pickerMode !== 'unknown' || effectiveSearch || !targetQuery.data) {
      return;
    }

    const nextPickerMode = targetQuery.data.totalItems > 5 ? 'large' : 'simple';
    setPickerMode(nextPickerMode);

    if (targetQuery.data.totalItems === 1) {
      const [onlyTarget] = targetQuery.data.items;

      if (onlyTarget) {
        onSelect(onlyTarget);
      }
    }
  }, [effectiveSearch, onSelect, pickerMode, targetQuery.data]);

  const isLargePicker =
    pickerMode === 'large' || (!effectiveSearch && (targetQuery.data?.totalItems ?? 0) > 5);
  const isLoadingResults = targetQuery.isPending || targetQuery.isFetching;
  const loadingState = (
    <>
      <p aria-label={t('payments.drawer.loadingTargets')} className="sr-only" role="status">
        {t('payments.drawer.loadingTargets')}
      </p>
      <div aria-hidden="true" className="grid gap-2">
        {paymentTargetSkeletonCards.map((cardIndex) => (
          <div
            className="grid gap-2 rounded-[5px] border border-border bg-background p-3"
            key={cardIndex}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="block h-4 w-2/3 rounded-[4px] bg-muted-foreground/20 motion-safe:animate-pulse" />
              <span className="block h-4 w-20 rounded-[4px] bg-muted-foreground/20 motion-safe:animate-pulse" />
            </div>
            <span className="block h-4 w-1/3 rounded-[4px] bg-muted-foreground/20 motion-safe:animate-pulse" />
          </div>
        ))}
      </div>
    </>
  );
  const emptyState = (
    <div className="rounded-[5px] border border-dashed border-border bg-background p-5 text-center">
      <p className="m-0 text-[0.82rem] font-bold text-muted-foreground">
        {t('payments.drawer.noTargets')}
      </p>
    </div>
  );

  return (
    <div className="grid gap-3">
      <h2 className="m-0 text-base font-black text-foreground">
        {t('payments.drawer.chooseTargetTitle')}
      </h2>
      {isLargePicker ? (
        <div className="grid gap-3">
          <div className="grid gap-2">
            <label
              className="text-[0.74rem] font-extrabold text-foreground"
              htmlFor="payment-target-search"
            >
              {t('payments.drawer.searchDebtDescriptions')}
            </label>
            <input
              autoComplete="off"
              className="min-h-10 rounded-[5px] border border-border bg-background px-3 text-[0.82rem] text-foreground outline-none transition placeholder:text-muted-foreground/70 focus:border-primary"
              id="payment-target-search"
              onChange={(event) => {
                setPage(1);
                setRawSearch(event.target.value);
              }}
              placeholder={t('payments.drawer.searchDebtDescriptions')}
              type="search"
              value={rawSearch}
            />
          </div>
          <div className="grid gap-2">
            <label
              className="text-[0.74rem] font-extrabold text-foreground"
              htmlFor="payment-target-status"
            >
              {t('payments.drawer.paymentStatus')}
            </label>
            <select
              className="min-h-10 rounded-[5px] border border-border bg-background px-3 text-[0.82rem] text-foreground outline-none transition focus:border-primary"
              id="payment-target-status"
              onChange={(event) => {
                const nextPaymentState = event.target.value;

                setPage(1);
                setPaymentState(
                  nextPaymentState === 'unpaid' || nextPaymentState === 'partiallyPaid'
                    ? nextPaymentState
                    : '',
                );
              }}
              value={paymentState}
            >
              <option value="">{t('payments.drawer.allTargets')}</option>
              <option value="unpaid">{t('payments.drawer.paymentStateUnpaid')}</option>
              <option value="partiallyPaid">
                {t('payments.drawer.paymentStatePartiallyPaid')}
              </option>
            </select>
          </div>
          {isLoadingResults ? (
            loadingState
          ) : targetQuery.data?.items.length === 0 ? (
            emptyState
          ) : targetQuery.data ? (
            <>
              <TargetOptions onSelect={onSelect} targets={targetQuery.data.items} />
              {targetQuery.data.totalPages > 1 ? (
                <div className="flex items-center justify-between gap-3">
                  <button
                    className="min-h-9 rounded-[5px] border border-border bg-background px-3 text-[0.76rem] font-extrabold text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={isLoadingResults || page === 1}
                    onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
                    type="button"
                  >
                    {t('payments.drawer.previousPage')}
                  </button>
                  <span className="text-[0.76rem] font-bold text-muted-foreground">
                    {page} / {targetQuery.data.totalPages}
                  </span>
                  <button
                    className="min-h-9 rounded-[5px] border border-border bg-background px-3 text-[0.76rem] font-extrabold text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={isLoadingResults || page >= targetQuery.data.totalPages}
                    onClick={() =>
                      setPage((currentPage) =>
                        Math.min(targetQuery.data?.totalPages ?? currentPage, currentPage + 1),
                      )
                    }
                    type="button"
                  >
                    {t('payments.drawer.nextPage')}
                  </button>
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      ) : isLoadingResults ? (
        loadingState
      ) : targetQuery.data?.items.length === 0 ? (
        emptyState
      ) : targetQuery.data &&
        targetQuery.data.totalItems >= 2 &&
        targetQuery.data.totalItems <= 5 ? (
        <TargetOptions onSelect={onSelect} targets={targetQuery.data.items} />
      ) : null}
    </div>
  );
}

function TargetOptions({
  onSelect,
  targets,
}: {
  onSelect: (target: PaymentTarget) => void;
  targets: PaymentTarget[];
}) {
  const { t } = useTranslation();
  const { locale } = useLocalization();
  const groupIdPrefix = useId();
  const groups = new Map<string, { debtDescription: string; targets: PaymentTarget[] }>();

  targets.forEach((target) => {
    const existingGroup = groups.get(target.debtId);

    if (existingGroup) {
      existingGroup.targets.push(target);
      return;
    }

    groups.set(target.debtId, {
      debtDescription: target.debtDescription,
      targets: [target],
    });
  });

  return (
    <div className="grid gap-2">
      {Array.from(groups, ([debtId, group], groupIndex) => {
        const headingId = `${groupIdPrefix}-debt-${groupIndex}`;

        return (
          <div aria-labelledby={headingId} className="grid gap-2" key={debtId} role="group">
            <h3 className="m-0 text-[0.82rem] font-black text-foreground" id={headingId}>
              {group.debtDescription}
            </h3>
            <div className="grid gap-2">
              {group.targets.map((target) => {
                const planLabel =
                  target.plan.type === 'installment'
                    ? t('payments.drawer.installmentLabel', { position: target.plan.position })
                    : t('payments.drawer.onePaymentTarget');
                const timingLabel =
                  target.timing === 'overdue'
                    ? t('payments.drawer.timingOverdue')
                    : target.timing === 'dueToday'
                      ? t('payments.drawer.timingDueToday')
                      : t('payments.drawer.timingUpcoming');
                const paymentStateLabel =
                  target.paymentState === 'partiallyPaid'
                    ? t('payments.drawer.paymentStatePartiallyPaid')
                    : t('payments.drawer.paymentStateUnpaid');

                return (
                  <button
                    aria-label={`${target.debtDescription}, ${planLabel}`}
                    className="grid w-full cursor-pointer gap-2 rounded-[5px] border border-border bg-background p-3 text-start text-foreground transition hover:bg-muted"
                    key={target.scheduleItemId}
                    onClick={() => onSelect(target)}
                    type="button"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="min-w-0 truncate text-[0.82rem] font-extrabold">
                        {planLabel}
                      </span>
                      <bdi className="shrink-0 text-[0.82rem] font-black" dir="ltr">
                        {formatCurrencyAmount(target.remainingAmount, target.currency, locale)}
                      </bdi>
                    </div>
                    <span className="text-[0.76rem] font-bold text-muted-foreground">
                      {t('payments.drawer.dueDateLabel')}: {formatDateOnly(target.dueDate, locale)}{' '}
                      · {timingLabel}
                    </span>
                    <span className="text-[0.76rem] font-bold text-muted-foreground">
                      {paymentStateLabel}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function createPaymentFormSchema(targetRemaining: string, today: string) {
  return paymentFieldsSchema.extend({
    amount: paymentFieldsSchema.shape.amount.pipe(
      z
        .string()
        .refine(
          (amount) => parseMoney(amount) <= parseMoney(targetRemaining),
          paymentApiErrorCode.paymentAmountExceedsRemaining,
        ),
    ),
    paymentDate: paymentFieldsSchema.shape.paymentDate.pipe(
      z
        .string()
        .refine((paymentDate) => paymentDate <= today, paymentApiErrorCode.paymentDateInFuture),
    ),
  });
}

function getPaymentPreview(
  amount: string,
  targetRemaining: string | undefined,
): PaymentPreview | undefined {
  const parsedAmount = paymentFieldsSchema.shape.amount.safeParse(amount);

  if (!targetRemaining || !parsedAmount.success) {
    return undefined;
  }

  const paymentAmount = parseMoney(parsedAmount.data);
  const target = parseMoney(targetRemaining);

  if (paymentAmount > target) {
    return { status: 'unavailable' };
  }

  return {
    status: 'available',
    targetRemaining: formatMoney(target - paymentAmount),
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
  currency: PaymentTarget['currency'];
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
