import { CalendarDays } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import type { DebtResponse } from '@collectify/contracts';

import {
  formatCurrencyAmount,
  useLocalization,
} from '../../shared/localization';

export function DebtCard({ debt }: { debt: DebtResponse }) {
  const { locale } = useLocalization();

  return (
    <article className="grid gap-3 rounded-[5px] border border-border bg-background p-3">
      <header className="grid gap-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h3 className="m-0 text-[0.88rem] font-black">{debt.description}</h3>
          <bdi className="text-[0.9rem] font-black" dir="ltr">
            {formatCurrencyAmount(debt.totalAmount, debt.currency, locale)}
          </bdi>
        </div>
      </header>

      <OnePaymentSummary debt={debt} locale={locale} />
    </article>
  );
}

function OnePaymentSummary({
  debt,
  locale,
}: {
  debt: DebtResponse;
  locale: string;
}) {
  const { t } = useTranslation();
  const scheduleItem = debt.scheduleItems[0];
  const paidAmount = '0.00';
  const remainingAmount = debt.totalAmount;
  const paidPercentage = 0;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2 text-[0.8rem] font-bold text-muted-foreground">
        <span>{t('debts.card.onePayment')}</span>
        <TimingBadge timing={scheduleItem?.timing} />
      </div>

      <div className="grid gap-3 border-t border-border pt-3">
        <div className="grid grid-cols-2 gap-3">
          <FinancialMetric
            currency={debt.currency}
            label={t('debts.card.paid')}
            locale={locale}
            value={paidAmount}
          />
          <FinancialMetric
            currency={debt.currency}
            label={t('debts.card.remaining')}
            locale={locale}
            value={remainingAmount}
          />
        </div>
        <div className="grid grid-cols-[1fr_auto] items-center gap-2">
          <div
            aria-label={t('debts.card.paymentProgress', {
              description: debt.description,
            })}
            aria-valuemax={100}
            aria-valuemin={0}
            aria-valuenow={paidPercentage}
            className="h-1.5 overflow-hidden rounded-full bg-muted"
            role="progressbar"
          >
            <span
              className="block h-full rounded-full bg-primary transition-[width] duration-200"
              style={{ width: `${paidPercentage}%` }}
            />
          </div>
          <span className="text-[0.72rem] font-black text-muted-foreground">
            {paidPercentage}%
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3 text-[0.8rem] font-bold text-muted-foreground">
        <CalendarDays aria-hidden="true" size={16} strokeWidth={2.4} />
        <span>{t('debts.card.dueDate')}</span>
        <time dateTime={scheduleItem?.dueDate}>
          {formatDebtDueDate(scheduleItem?.dueDate, locale)}
        </time>
      </div>
    </>
  );
}

function FinancialMetric({
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
      <span className="text-[0.68rem] font-black text-muted-foreground">
        {label}
      </span>
      <bdi className="text-[0.9rem] font-black" dir="ltr">
        {formatCurrencyAmount(value, currency, locale)}
      </bdi>
    </div>
  );
}

function TimingBadge({ timing }: { timing: DebtResponse['scheduleItems'][number]['timing'] | undefined }) {
  const { t } = useTranslation();

  if (timing === 'dueToday') {
    return (
      <span className="inline-flex rounded-[5px] border border-status-due-border bg-status-due-background px-2 py-0.5 text-[0.7rem] font-black text-status-due-foreground">
        {t('debts.card.dueToday')}
      </span>
    );
  }

  if (timing === 'overdue') {
    return (
      <span className="inline-flex rounded-[5px] border border-status-overdue-border bg-status-overdue-background px-2 py-0.5 text-[0.7rem] font-black text-status-overdue-foreground">
        {t('debts.card.overdue')}
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-[5px] border border-border bg-muted px-2 py-0.5 text-[0.7rem] font-black text-muted-foreground">
      {t('debts.card.upcoming')}
    </span>
  );
}

function formatDebtDueDate(dueDate: string | undefined, locale: string): string {
  if (!dueDate) {
    return '';
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'long',
    timeZone: 'UTC',
  }).format(new Date(`${dueDate}T00:00:00.000Z`));
}
