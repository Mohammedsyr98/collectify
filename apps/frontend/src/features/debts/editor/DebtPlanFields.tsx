import { CalendarDays } from 'lucide-react';
import { useRef } from 'react';
import { useController, useFormContext, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { FormInput } from '../../../shared/ui/form/FormInput';
import { SegmentedControl } from '../../../shared/ui/segmented-control/SegmentedControl';
import { type DebtDraft, type InstallmentFrequency, type PaymentPlan } from './debt-draft';
import { InstallmentSchedulePreview } from './InstallmentSchedulePreview';

export function DebtPlanFields({
  disabled,
  formatError,
  mode,
}: {
  disabled: boolean;
  formatError: (error: string) => string;
  mode: 'create' | 'edit';
}) {
  const { t } = useTranslation();
  const { control, setValue } = useFormContext<DebtDraft>();
  const paymentPlanField = useController({
    control,
    name: 'paymentPlan',
  }).field;
  const installmentFrequencyField = useController({
    control,
    name: 'installmentPlan.frequency',
  }).field;
  const paymentPlan = useWatch({ control, name: 'paymentPlan' });
  const onePaymentDueDate = useWatch({
    control,
    name: 'onePayment.dueDate',
  });
  const installmentActivated = useRef(false);

  const selectPaymentPlan = (value: PaymentPlan) => {
    if (value === 'installment' && !installmentActivated.current) {
      installmentActivated.current = true;

      if (onePaymentDueDate) {
        setValue('installmentPlan.firstDueDate', onePaymentDueDate);
      }
    }

    paymentPlanField.onChange(value);
  };

  return (
    <div className="grid gap-[13px]">
      {mode === 'create' ? (
        <fieldset className="m-0 grid gap-[5px] border-0 p-0" disabled={disabled}>
          <legend className="p-0 text-[0.73rem] font-bold leading-[1.3] text-card-foreground">
            {t('debts.form.paymentPlanLabel')}
          </legend>
          <SegmentedControl
            ariaLabel={t('debts.form.paymentPlanLabel')}
            onChange={selectPaymentPlan}
            options={[
              {
                label: t('debts.form.onePaymentOption'),
                value: 'onePayment',
              },
              {
                label: t('debts.form.installmentsOption'),
                value: 'installment',
              },
            ]}
            value={paymentPlan}
          />
        </fieldset>
      ) : null}

      {paymentPlan === 'onePayment' ? (
        <FormInput<DebtDraft>
          disabled={disabled}
          formatError={formatError}
          icon={<CalendarDays aria-hidden="true" size={16} strokeWidth={2.2} />}
          label={t('debts.form.dueDateLabel')}
          name="onePayment.dueDate"
          type="date"
        />
      ) : (
        <>
          <FormInput<DebtDraft>
            disabled={disabled}
            formatError={formatError}
            inputMode="numeric"
            label={t('debts.form.installmentCountLabel')}
            name="installmentPlan.installmentCount"
            type="text"
          />
          <fieldset className="m-0 grid gap-[5px] border-0 p-0" disabled={disabled}>
            <legend className="p-0 text-[0.73rem] font-bold leading-[1.3] text-card-foreground">
              {t('debts.form.frequencyLabel')}
            </legend>
            <SegmentedControl
              ariaLabel={t('debts.form.frequencyLabel')}
              onChange={(value: InstallmentFrequency) => installmentFrequencyField.onChange(value)}
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
              value={installmentFrequencyField.value}
            />
          </fieldset>
          <FormInput<DebtDraft>
            disabled={disabled}
            formatError={formatError}
            icon={<CalendarDays aria-hidden="true" size={16} strokeWidth={2.2} />}
            label={t('debts.form.firstInstallmentDueDateLabel')}
            name="installmentPlan.firstDueDate"
            type="date"
          />
          <InstallmentSchedulePreview />
        </>
      )}
    </div>
  );
}
