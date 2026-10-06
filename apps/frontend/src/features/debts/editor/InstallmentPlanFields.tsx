import { CalendarDays } from 'lucide-react';
import {
  useController,
  useFieldArray,
  useFormContext,
  useWatch,
} from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { FormInput } from '../../../shared/ui/form/FormInput';
import { SegmentedControl } from '../../../shared/ui/segmented-control/SegmentedControl';
import { type DebtDraft } from './debt-draft';
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
  const { control, setValue } = useFormContext<DebtDraft>();
  const mode = useWatch({ control, name: 'installmentPlan.mode' });
  const totalAmount = useWatch({ control, name: 'totalAmount' });
  const currency = useWatch({ control, name: 'currency' });
  const automatic = useWatch({ control, name: 'installmentPlan.automatic' });
  const frequencyField = useController({
    control,
    name: 'installmentPlan.automatic.frequency',
  }).field;
  const { fields, replace } = useFieldArray({
    control,
    name: 'installmentPlan.manual.scheduleItems',
  });
  const scheduleResult = buildInstallmentScheduleFromDraft({
    totalAmount,
    installmentPlan: automatic,
  });

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
          <div className="grid gap-3">
            {fields.map((field, index) => (
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
                  name={`installmentPlan.manual.scheduleItems.${index}.dueDate`}
                  type="date"
                />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
