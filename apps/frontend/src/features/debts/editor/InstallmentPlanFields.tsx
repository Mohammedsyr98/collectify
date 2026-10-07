import { useEffect } from 'react';
import { CalendarDays } from 'lucide-react';
import {
  useController,
  useFieldArray,
  useFormContext,
  useWatch,
} from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import {
  getInstallmentDueDateRange,
  type InstallmentDueDateRange,
} from '@collectify/domain/debt-plan';

import { FormInput } from '../../../shared/ui/form/FormInput';
import { SegmentedControl } from '../../../shared/ui/segmented-control/SegmentedControl';
import { formatCurrencyAmount, useLocalization } from '../../../shared/localization';
import { buildManualInstallmentSummary, type DebtDraft } from './debt-draft';
import { InstallmentSchedulePreview } from './InstallmentSchedulePreview';
import { buildInstallmentScheduleFromDraft } from './installment-schedule-draft';

export function InstallmentPlanFields({
  disabled,
  formatError,
}: {
  disabled: boolean;
  formatError: (error: string) => string;
}) {
  const { t } = useTranslation();
  const { locale } = useLocalization();
  const {
    control,
    formState: { errors, isSubmitted },
    setValue,
    trigger,
  } = useFormContext<DebtDraft>();
  const mode = useWatch({ control, name: 'installmentPlan.mode' });
  const totalAmount = useWatch({ control, name: 'totalAmount' });
  const currency = useWatch({ control, name: 'currency' });
  const automatic = useWatch({ control, name: 'installmentPlan.automatic' });
  const manualScheduleItems = useWatch({
    control,
    name: 'installmentPlan.manual.scheduleItems',
  });
  const frequencyField = useController({
    control,
    name: 'installmentPlan.automatic.frequency',
  }).field;
  const { append, fields, remove, replace } = useFieldArray({
    control,
    name: 'installmentPlan.manual.scheduleItems',
  });
  const scheduleResult = buildInstallmentScheduleFromDraft({
    totalAmount,
    installmentPlan: automatic,
  });
  const manualSummary = buildManualInstallmentSummary({
    scheduleItems: manualScheduleItems,
    totalAmount,
  });
  const manualPlanErrors = Object.values(
    errors.installmentPlan?.manual?.scheduleItems?.root?.types ?? {},
  )
    .flat()
    .filter((message): message is string => typeof message === 'string');

  useEffect(() => {
    if (!isSubmitted || mode !== 'manual') {
      return;
    }

    void trigger('installmentPlan.manual.scheduleItems');
  }, [isSubmitted, manualScheduleItems, mode, totalAmount, trigger]);

  const customize = () => {
    if (scheduleResult.status !== 'ready') {
      return;
    }

    replace(
      scheduleResult.scheduleItems.map(({ amount, dueDate }) => ({
        amount,
        dueDate,
      })),
    );
    setValue('installmentPlan.mode', 'manual');
  };

  const reset = () => {
    replace([]);
    setValue('installmentPlan.mode', 'automatic');
  };

  const maximum = scheduleResult.maximumInstallmentCount;
  const minimumInstallmentCount = 2;
  const isAddDisabled =
    disabled || maximum === undefined || fields.length >= maximum;
  const manualCountGuidance =
    maximum === undefined || maximum < minimumInstallmentCount
      ? t('debts.form.installmentsUnavailable')
      : t('debts.form.installmentCountGuidance', {
          maximum,
          minimum: minimumInstallmentCount,
        });

  return (
    <div className="grid gap-[13px]">
      {mode === 'automatic' ? (
        <>
          <FormInput<DebtDraft>
            disabled={disabled}
            formatError={formatError}
            inputMode="numeric"
            label={t('debts.form.installmentCountLabel')}
            name="installmentPlan.automatic.installmentCount"
            type="text"
          />
          <fieldset className="m-0 grid gap-[5px] border-0 p-0" disabled={disabled}>
            <legend className="p-0 text-[0.73rem] font-bold leading-[1.3] text-card-foreground">
              {t('debts.form.frequencyLabel')}
            </legend>
            <SegmentedControl
              ariaLabel={t('debts.form.frequencyLabel')}
              onChange={(value: 'weekly' | 'monthly') => frequencyField.onChange(value)}
              options={[
                {
                  label: t('debts.form.weeklyOption'),
                  value: 'weekly',
                },
                {
                  label: t('debts.form.monthlyOption'),
                  value: 'monthly',
                },
              ]}
              value={frequencyField.value}
            />
          </fieldset>
          <FormInput<DebtDraft>
            disabled={disabled}
            formatError={formatError}
            icon={<CalendarDays aria-hidden="true" size={16} strokeWidth={2.2} />}
            label={t('debts.form.firstInstallmentDueDateLabel')}
            name="installmentPlan.automatic.firstDueDate"
            type="date"
          />
          <InstallmentSchedulePreview
            currency={currency}
            disabled={disabled}
            onCustomize={customize}
            scheduleResult={scheduleResult}
          />
        </>
      ) : (
        <section className="grid gap-3">
          <button
            className="min-h-10 cursor-pointer rounded-[5px] border border-border bg-background px-3 text-[0.78rem] font-extrabold text-foreground transition duration-150 hover:bg-muted disabled:cursor-wait disabled:opacity-70"
            disabled={disabled}
            onClick={reset}
            type="button"
          >
            {t('debts.form.resetToAutomaticSchedule')}
          </button>
          <p
            className="m-0 text-[0.72rem] leading-[1.35] text-muted-foreground"
            id="manual-installment-count-guidance"
          >
            {manualCountGuidance}
          </p>
          <div className="grid gap-3">
            {fields.map((field, index) => {
              const dateBounds = getManualDateBounds(manualScheduleItems, index);

              return (
                <div className="grid gap-2" key={field.id}>
                  <FormInput<DebtDraft>
                    disabled={disabled}
                    formatError={formatError}
                    inputMode="decimal"
                    label={t('debts.form.installmentAmountFieldLabel', { number: index + 1 })}
                    name={`installmentPlan.manual.scheduleItems.${index}.amount`}
                    type="text"
                  />
                  <FormInput<DebtDraft>
                    disabled={disabled}
                    formatError={formatError}
                    label={t('debts.form.installmentDueDateFieldLabel', { number: index + 1 })}
                    max={dateBounds.latestDueDate}
                    min={dateBounds.earliestDueDate}
                    name={`installmentPlan.manual.scheduleItems.${index}.dueDate`}
                    type="date"
                  />
                  <button
                    aria-describedby="manual-installment-count-guidance"
                    aria-label={t('debts.form.removeInstallment', { number: index + 1 })}
                    className="min-h-9 cursor-pointer rounded-[5px] border border-border bg-background px-3 text-[0.75rem] font-extrabold text-foreground transition duration-150 hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={disabled || fields.length <= 2}
                    onClick={() => remove(index)}
                    type="button"
                  >
                    {t('debts.form.removeInstallment', { number: index + 1 })}
                  </button>
                </div>
              );
            })}
          </div>
          {manualSummary.status === 'ready' ? (
            <section
              aria-label={t('debts.form.installmentSummaryLabel')}
              aria-live="polite"
              className="grid gap-2 rounded-[5px] border border-border bg-background p-3"
            >
              <h3 className="m-0 text-[0.78rem] font-black text-foreground">
                {t('debts.form.installmentSummaryLabel')}
              </h3>
              <dl className="m-0 grid gap-1 text-[0.75rem]">
                <SummaryRow
                  label={t('debts.form.debtTotalLabel')}
                  value={formatCurrencyAmount(manualSummary.summary.debtTotal, currency, locale)}
                />
                <SummaryRow
                  label={t('debts.form.scheduleTotalLabel')}
                  value={formatCurrencyAmount(
                    manualSummary.summary.scheduleTotal,
                    currency,
                    locale,
                  )}
                />
                <SummaryRow
                  label={
                    manualSummary.summary.difference.kind === 'remaining'
                      ? t('debts.form.remainingAmountLabel')
                      : t('debts.form.excessAmountLabel')
                  }
                  value={formatCurrencyAmount(
                    manualSummary.summary.difference.amount,
                    currency,
                    locale,
                  )}
                />
              </dl>
              {manualPlanErrors.map((message) => (
                <p
                  className="m-0 text-[0.72rem] font-bold leading-[1.35] text-status-overdue-foreground"
                  key={message}
                  role="alert"
                >
                  {formatError(message)}
                </p>
              ))}
            </section>
          ) : null}
          <button
            aria-describedby="manual-installment-count-guidance"
            className="min-h-10 cursor-pointer rounded-[5px] border border-border bg-background px-3 text-[0.78rem] font-extrabold text-foreground transition duration-150 hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isAddDisabled}
            onClick={() => append({ amount: '', dueDate: '' })}
            type="button"
          >
            {t('debts.form.addInstallment')}
          </button>
        </section>
      )}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="m-0 font-bold text-foreground">
        <bdi dir="ltr">{value}</bdi>
      </dd>
    </div>
  );
}

function getManualDateBounds(
  scheduleItems: readonly { dueDate: string }[],
  index: number,
): InstallmentDueDateRange {
  return getInstallmentDueDateRange({
    nextDueDate: scheduleItems[index + 1]?.dueDate,
    previousDueDate: scheduleItems[index - 1]?.dueDate,
  });
}
