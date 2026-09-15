import { CreditCard, Pencil, Plus, ReceiptText, type LucideIcon } from 'lucide-react';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router';

import {
  customerApiErrorCode,
  type Currency,
  type CustomerCurrencySummary,
  type DebtResponse,
} from '@collectify/contracts';

import { isApiError } from '../../shared/api/http';
import { useLocalization } from '../../shared/localization';
import { ErrorStatePage } from '../../shared/ui/error/ErrorStatePage';
import { LoadingScreen } from '../../shared/ui/loading/LoadingScreen';
import {
  SegmentedControl,
  type SegmentedControlOption,
} from '../../shared/ui/segmented-control/SegmentedControl';
import { CustomerEditModal } from './CustomerEditModal';
import { useCustomerDetailsQuery, useUpdateCustomerMutation } from './customerQueries';
import { DebtDrawer } from '../debts/DebtDrawer';
import {
  useCreateDebtMutation,
  useDebtListQuery,
} from '../debts/debtQueries';

type CurrencySelection = 'all' | CustomerCurrencySummary['currency'];

export function CustomerDetailsPage({
  defaultCurrency,
}: {
  defaultCurrency?: Currency;
}) {
  const { customerId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { locale } = useLocalization();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDebtDrawerOpen, setIsDebtDrawerOpen] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencySelection>('all');
  const addDebtButtonRef = useRef<HTMLButtonElement>(null);
  const customerQuery = useCustomerDetailsQuery(customerId);
  const debtQuery = useDebtListQuery(customerId);
  const { createDebt, isCreating } = useCreateDebtMutation({
    customerId: customerId ?? '',
    onCreated: () => setIsDebtDrawerOpen(false),
  });
  const { isUpdating, updateCustomer } = useUpdateCustomerMutation({
    onUpdated: () => setIsEditModalOpen(false),
  });

  if (customerQuery.isLoading) {
    return <LoadingScreen ariaLabel={t('app.loading.ariaLabel')} />;
  }

  if (
    isApiError(customerQuery.error) &&
    customerQuery.error.code === customerApiErrorCode.customerNotFound
  ) {
    return (
      <ErrorStatePage
        actionLabel={t('customers.notFound.action')}
        detail={t('customers.notFound.detail')}
        onAction={() => navigate('/customers')}
        title={t('customers.notFound.title')}
      />
    );
  }

  if (customerQuery.isError || !customerQuery.data) {
    return (
      <ErrorStatePage
        actionLabel={t('app.error.retry')}
        detail={t('errors.genericDescription')}
        isActionPending={customerQuery.isFetching}
        onAction={() => {
          void customerQuery.refetch();
        }}
        title={t('app.error.sessionUnavailable.title')}
      />
    );
  }

  const customer = customerQuery.data;

  return (
    <>
      <main
        aria-label={customer.name}
        className="min-h-screen flex-1 bg-background p-6 text-foreground"
      >
        <div className="mx-auto grid w-full max-w-6xl gap-6">
          <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5">
            <div className="grid gap-2">
              <h1 className="m-0 text-[1.8rem] font-black leading-tight tracking-normal">
                {customer.name}
              </h1>
              <p className="m-0 inline-flex w-fit rounded-[5px] bg-muted px-2.5 py-1 text-[0.72rem] font-black text-muted-foreground">
                {t('customers.details.code')}: {customer.code}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[5px] border border-border bg-card px-4 text-[0.8rem] font-extrabold text-foreground transition duration-150 hover:bg-muted"
                onClick={() => setIsEditModalOpen(true)}
                type="button"
              >
                <Pencil aria-hidden="true" size={16} strokeWidth={2.6} />
                {t('customers.actions.edit')}
              </button>
              <button
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[5px] border border-border bg-card px-4 text-[0.8rem] font-extrabold text-muted-foreground opacity-65"
                disabled={!defaultCurrency}
                onClick={() => setIsDebtDrawerOpen(true)}
                ref={addDebtButtonRef}
                type="button"
              >
                <Plus aria-hidden="true" size={16} strokeWidth={2.6} />
                {t('customers.actions.addDebt')}
              </button>
              <button
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[5px] border border-border bg-card px-4 text-[0.8rem] font-extrabold text-muted-foreground opacity-65"
                disabled
                type="button"
              >
                <CreditCard aria-hidden="true" size={16} strokeWidth={2.6} />
                {t('customers.actions.recordPayment')}
              </button>
            </div>
          </header>

          <section className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
            <div className="grid gap-3 rounded-md border border-border bg-card p-4">
              <InfoRow label={t('customers.details.phoneNumber')} value={customer.phoneNumber} />
              <InfoRow
                label={t('customers.details.address')}
                value={customer.address ?? t('customers.details.noAddress')}
              />
            </div>

            <section
              aria-label={t('customers.details.financialSummary')}
              className="grid gap-3 rounded-md border border-border bg-card p-4"
            >
              <h2 className="m-0 text-[0.95rem] font-black tracking-normal">
                {t('customers.details.financialSummary')}
              </h2>
              {customer.financialSummary.length === 0 ? (
                <p className="m-0 rounded-[5px] bg-background p-3 text-[0.82rem] font-bold text-muted-foreground">
                  {t('customers.details.noFinancialActivity')}
                </p>
              ) : (
                <CurrencySummaryCard
                  currencySummaries={customer.financialSummary}
                  locale={locale}
                  onCurrencyChange={setSelectedCurrency}
                  selectedCurrency={selectedCurrency}
                  t={t}
                />
              )}
            </section>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <DebtLedgerSection
              debts={debtQuery.data?.items ?? []}
              locale={locale}
              t={t}
            />
            <EmptyLedgerSection
              Icon={CreditCard}
              emptyText={t('customers.details.paymentsEmpty')}
              title={t('customers.details.payments')}
            />
          </section>
        </div>
      </main>

      {isEditModalOpen ? (
        <CustomerEditModal
          customer={customer}
          isSubmitting={isUpdating}
          onClose={() => setIsEditModalOpen(false)}
          onSubmit={(request) =>
            updateCustomer({
              customerId: customer.id,
              request,
            })
          }
        />
      ) : null}
      {isDebtDrawerOpen && defaultCurrency ? (
        <DebtDrawer
          defaultCurrency={defaultCurrency}
          isSubmitting={isCreating}
          onClose={() => setIsDebtDrawerOpen(false)}
          onSubmit={createDebt}
          returnFocusRef={addDebtButtonRef}
        />
      ) : null}
    </>
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

function formatCurrencyAmount(
  amount: string,
  currency: CustomerCurrencySummary['currency'],
  locale: string,
): string {
  const formatter = new Intl.NumberFormat(locale, {
    currency,
    currencyDisplay: 'symbol',
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: 'currency',
  });

  // Intl preserves decimal strings, while the TypeScript lib exposes only number and bigint here.
  return formatter.format(amount as unknown as number);
}

function resolvePaidRatio(summary: CustomerCurrencySummary): number {
  const totalDebt = Number(summary.totalDebtAmount);
  const totalPaid = Number(summary.totalPaidAmount);

  if (totalDebt <= 0) {
    return 0;
  }

  return Math.min(1, Math.max(0, totalPaid / totalDebt));
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1">
      <span className="text-[0.68rem] font-black text-muted-foreground">{label}</span>
      <span className="text-[0.88rem] font-bold">{value}</span>
    </div>
  );
}

function EmptyLedgerSection({
  emptyText,
  Icon,
  title,
}: {
  emptyText: string;
  Icon: LucideIcon;
  title: string;
}) {
  return (
    <section
      aria-label={title}
      className="grid min-h-[190px] gap-4 rounded-md border border-border bg-card p-4"
    >
      <h2 className="m-0 text-[0.95rem] font-black tracking-normal">{title}</h2>
      <div className="grid place-items-center gap-2 self-stretch rounded-[5px] border border-dashed border-border bg-background p-5 text-center text-muted-foreground">
        <Icon aria-hidden="true" size={22} strokeWidth={2.2} />
        <p className="m-0 text-[0.82rem] font-bold">{emptyText}</p>
      </div>
    </section>
  );
}

function DebtLedgerSection({
  debts,
  locale,
  t,
}: {
  debts: DebtResponse[];
  locale: string;
  t: (key: string, options?: Record<string, unknown>) => string;
}) {
  return (
    <section
      aria-label={t('customers.details.debts')}
      className="grid min-h-[190px] gap-4 rounded-md border border-border bg-card p-4"
    >
      <h2 className="m-0 text-[0.95rem] font-black tracking-normal">
        {t('customers.details.debts')}
      </h2>
      {debts.length === 0 ? (
        <div className="grid place-items-center gap-2 self-stretch rounded-[5px] border border-dashed border-border bg-background p-5 text-center text-muted-foreground">
          <ReceiptText aria-hidden="true" size={22} strokeWidth={2.2} />
          <p className="m-0 text-[0.82rem] font-bold">
            {t('customers.details.debtsEmpty')}
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {debts.map((debt) => (
            <article
              className="grid gap-2 rounded-[5px] border border-border bg-background p-3"
              key={debt.id}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h3 className="m-0 text-[0.88rem] font-black">
                  {debt.description}
                </h3>
                {debt.scheduleItems[0]?.timing === 'dueToday' ? (
                  <span className="inline-flex rounded-[5px] border border-status-due-border bg-status-due-background px-2 py-0.5 text-[0.7rem] font-black text-status-due-foreground">
                    {t('debts.card.dueToday')}
                  </span>
                ) : null}
                {debt.scheduleItems[0]?.timing === 'overdue' ? (
                  <span className="inline-flex rounded-[5px] border border-status-overdue-border bg-status-overdue-background px-2 py-0.5 text-[0.7rem] font-black text-status-overdue-foreground">
                    {t('debts.card.overdue')}
                  </span>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[0.8rem] font-bold text-muted-foreground">
                <bdi dir="ltr">
                  {formatCurrencyAmount(debt.totalAmount, debt.currency, locale)}
                </bdi>
                <span>{t('debts.card.onePayment')}</span>
                <time dateTime={debt.scheduleItems[0]?.dueDate}>
                  {formatDebtDueDate(debt.scheduleItems[0]?.dueDate, locale)}
                </time>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
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
