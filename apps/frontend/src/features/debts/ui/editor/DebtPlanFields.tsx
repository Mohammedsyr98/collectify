import { CalendarDays } from 'lucide-react';
import { useRef } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { FormInput } from '@/shared/ui/form';
import { SegmentedControl } from '@/shared/ui/segmented-control';
import type { DebtDraft } from '../../model/debt-draft';
import { InstallmentPlanFields } from './InstallmentPlanFields';

export function DebtPlanFields({
  addInstallmentDisabled,
  formatError,
  isPlanSelectionDisabled,
  isSubmitting,
  mode,
}: {
  addInstallmentDisabled: boolean;
  formatError: (error: string) => string;
  isPlanSelectionDisabled: boolean;
  isSubmitting: boolean;
  mode: 'create' | 'edit';
}) {
  const { t } = useTranslation();
  const { control, setValue } = useFormContext<DebtDraft>();
  const paymentPlan = useWatch({ control, name: 'paymentPlan' });
  const onePaymentDueDate = useWatch({
    control,
    name: 'onePayment.dueDate',
  });
  const installmentActivated = useRef(false);

  const selectPaymentPlan = (value: DebtDraft['paymentPlan']) => {
    if (value === 'installment' && !installmentActivated.current) {
      installmentActivated.current = true;

      if (onePaymentDueDate) {
        setValue('installmentPlan.automatic.firstInstallmentDueDate', onePaymentDueDate);
      }
    }

    setValue('paymentPlan', value);
  };

  return (
    <div className="grid gap-[13px]">
      <fieldset className="m-0 grid gap-[5px] border-0 p-0" disabled={isSubmitting}>
        <legend className="p-0 text-[0.73rem] font-bold leading-[1.3] text-card-foreground">
          {t('debts.form.paymentPlanLabel')}
        </legend>
        <SegmentedControl
          ariaLabel={t('debts.form.paymentPlanLabel')}
          disabled={isSubmitting || isPlanSelectionDisabled}
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

      {paymentPlan === 'onePayment' ? (
        <FormInput<DebtDraft>
          disabled={isSubmitting}
          formatError={formatError}
          icon={<CalendarDays aria-hidden="true" size={16} strokeWidth={2.2} />}
          label={t('debts.form.dueDateLabel')}
          name="onePayment.dueDate"
          type="date"
        />
      ) : (
        <InstallmentPlanFields
          allowScheduleGeneration={mode === 'create'}
          addInstallmentDisabled={addInstallmentDisabled}
          formatError={formatError}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  );
}
