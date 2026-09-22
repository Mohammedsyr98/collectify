import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { CustomerCurrencySummary } from '@collectify/contracts';

import {
  formatCurrencyAmount,
  useLocalization,
} from '../../shared/localization';
import {
  SegmentedControl,
  type SegmentedControlOption,
} from '../../shared/ui/segmented-control/SegmentedControl';

type CurrencySelection = 'all' | CustomerCurrencySummary['currency'];

export function CustomerFinancialSummary({
  summaries,
}: {
  summaries: CustomerCurrencySummary[];
}) {
  const { t } = useTranslation();
  const { locale } = useLocalization();
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencySelection>('all');

  return (
    <section
      aria-label={t('customers.details.financialSummary')}
      className="grid gap-3 rounded-md border border-border bg-card p-4"
    >
      <h2 className="m-0 text-[0.95rem] font-black tracking-normal">
        {t('customers.details.financialSummary')}
      </h2>
      {summaries.length === 0 ? (
        <p className="m-0 rounded-[5px] bg-background p-3 text-[0.82rem] font-bold text-muted-foreground">
          {t('customers.details.noFinancialActivity')}
        </p>
      ) : (
        <CurrencySummaryCard
          currencySummaries={summaries}
          locale={locale}
          onCurrencyChange={setSelectedCurrency}
          selectedCurrency={selectedCurrency}
          t={t}
        />
      )}
    </section>
  );
}

function CurrencySummaryCard({
  currencySummaries,
  locale,
  onCurrencyChange,
  selectedCurrency,
  t,
}: {
  currencySummaries: CustomerCurrencySummary[];
  locale: string;
  onCurrencyChange: (currency: CurrencySelection) => void;
  selectedCurrency: CurrencySelection;
  t: (key: string, options?: Record<string, unknown>) => string;
}) {
  const orderedSummaries = [...currencySummaries].sort((left, right) =>
    left.currency.localeCompare(right.currency),
  );
  const hasSelectedCurrency = orderedSummaries.some(
    (summary) => summary.currency === selectedCurrency,
  );
  const effectiveSelection =
    selectedCurrency === 'all' || hasSelectedCurrency ? selectedCurrency : 'all';
  const visibleSummaries =
    effectiveSelection === 'all'
      ? orderedSummaries
      : orderedSummaries.filter((summary) => summary.currency === effectiveSelection);
  const currencyOptions: SegmentedControlOption<CurrencySelection>[] = [
    {
      label: t('customers.details.allCurrencies'),
      value: 'all',
    },
    ...orderedSummaries.map((summary) => ({
      label: summary.currency,
      value: summary.currency,
    })),
  ];

  return (
    <div className="grid gap-3 border-t border-border pt-3">
      {orderedSummaries.length > 1 ? (
        <SegmentedControl
          ariaLabel={t('customers.details.currency')}
          onChange={onCurrencyChange}
          options={currencyOptions}
          value={effectiveSelection}
        />
      ) : null}

      <div className="grid gap-3">
        {visibleSummaries.map((summary) => (
          <CurrencySummaryBlock
            key={summary.currency}
            locale={locale}
            summary={summary}
            t={t}
          />
        ))}
      </div>
    </div>
  );
}

function CurrencySummaryBlock({
  locale,
  summary,
  t,
}: {
  locale: string;
  summary: CustomerCurrencySummary;
  t: (key: string, options?: Record<string, unknown>) => string;
}) {
  const paidRatio = resolvePaidRatio(summary);
  const paidPercentage = Math.round(paidRatio * 100);

  return (
    <div className="grid gap-3 border-t border-border pt-3 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="inline-flex min-h-8 items-center rounded-[5px] bg-muted px-2.5 text-[0.76rem] font-black text-foreground">
          {summary.currency}
        </span>
        {summary.remainingAmount === '0.00' ? (
          <span className="text-[0.76rem] font-black text-status-paid-foreground">
            {t('customers.details.paidInFull')}
          </span>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryMetric
          label={t('customers.details.totalDebt')}
          value={formatCurrencyAmount(summary.totalDebtAmount, summary.currency, locale)}
        />
        <SummaryMetric
          label={t('customers.details.totalPaid')}
          value={formatCurrencyAmount(summary.totalPaidAmount, summary.currency, locale)}
        />
        <SummaryMetric
          label={t('customers.details.balance')}
          value={formatCurrencyAmount(summary.remainingAmount, summary.currency, locale)}
        />
      </div>

      <div className="grid grid-cols-[1fr_auto] items-center gap-2">
        <div
          aria-label={t('customers.details.paymentProgress', {
            currency: summary.currency,
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
        <span className="text-[0.72rem] font-black text-muted-foreground">{paidPercentage}%</span>
      </div>
    </div>
  );
}

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1">
      <span className="text-[0.68rem] font-black text-muted-foreground">{label}</span>
      <bdi className="text-[1.05rem] font-black leading-tight" dir="ltr">
        {value}
      </bdi>
    </div>
  );
}

function resolvePaidRatio(summary: CustomerCurrencySummary): number {
  const totalDebt = Number(summary.totalDebtAmount);
  const totalPaid = Number(summary.totalPaidAmount);

  if (totalDebt <= 0) {
    return 0;
  }

  return Math.min(1, Math.max(0, totalPaid / totalDebt));
}
