import { useTranslation } from 'react-i18next';

import type { Currency } from '@collectify/contracts';

import {
  formatCurrencyAmount,
  formatDateOnly,
  useLocalization,
} from '../../../shared/localization';
import type { InstallmentScheduleResult } from './installment-schedule-draft';

export function InstallmentSchedulePreview({
  currency,
  disabled,
  onCustomize,
  scheduleResult,
}: {
  currency: Currency;
  disabled: boolean;
  onCustomize: () => void;
  scheduleResult: InstallmentScheduleResult;
}) {
  const { t } = useTranslation();
  const { locale } = useLocalization();

  return (
    <div className="grid gap-2">
      {scheduleResult.maximumInstallmentCount !== undefined ? (
        <p className="m-0 text-[0.72rem] leading-[1.35] text-muted-foreground">
          {scheduleResult.maximumInstallmentCount < 2
            ? t('debts.form.installmentsUnavailable')
            : t('debts.form.installmentCountGuidance', {
                maximum: scheduleResult.maximumInstallmentCount,
                minimum: 2,
              })}
        </p>
      ) : null}

      {scheduleResult.status === 'ready' ? (
        <section
          aria-live="polite"
          aria-labelledby="installment-preview-heading"
          className="grid gap-2 rounded-[5px] border border-border bg-background p-3"
        >
          <h3
            className="m-0 text-[0.78rem] font-black text-foreground"
            id="installment-preview-heading"
          >
            {t('debts.form.installmentPreviewLabel')}
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-start text-[0.75rem]">
              <caption className="sr-only">{t('debts.form.installmentPreviewCaption')}</caption>
              <thead className="text-muted-foreground">
                <tr>
                  <th className="px-2 py-1 text-start font-bold" scope="col">
                    {t('debts.form.installmentNumberLabel')}
                  </th>
                  <th className="px-2 py-1 text-start font-bold" scope="col">
                    {t('debts.form.installmentAmountLabel')}
                  </th>
                  <th className="px-2 py-1 text-start font-bold" scope="col">
                    {t('debts.form.installmentDueDateLabel')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {scheduleResult.scheduleItems.map((scheduleItem, index) => (
                  <tr className="border-t border-border" key={scheduleItem.dueDate}>
                    <th className="px-2 py-2 text-start font-bold" scope="row">
                      {index + 1}
                    </th>
                    <td className="px-2 py-2 font-bold">
                      <bdi dir="ltr">
                        {formatCurrencyAmount(scheduleItem.amount, currency, locale)}
                      </bdi>
                    </td>
                    <td className="px-2 py-2">
                      <time dateTime={scheduleItem.dueDate}>
                        {formatDateOnly(scheduleItem.dueDate, locale)}
                      </time>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            className="min-h-10 cursor-pointer rounded-[5px] border border-border bg-background px-3 text-[0.78rem] font-extrabold text-foreground transition duration-150 hover:bg-muted disabled:cursor-wait disabled:opacity-70"
            disabled={disabled}
            onClick={onCustomize}
            type="button"
          >
            {t('debts.form.customizeInstallments')}
          </button>
        </section>
      ) : null}
    </div>
  );
}
