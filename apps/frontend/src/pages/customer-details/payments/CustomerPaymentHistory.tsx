import { CreditCard, Pencil } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import type { PaymentHistoryItem } from '@collectify/contracts';

import { useCustomerPaymentHistoryQuery } from '@/entities/customer';
import {
  formatCurrencyAmount,
  formatDateOnly,
  useLocalization,
} from '@/shared/localization';

const paymentSkeletonRows = Array.from({ length: 3 }, (_, index) => index);

export function CustomerPaymentHistory({
  customerId,
  onEditPayment,
}: {
  customerId: string;
  onEditPayment: (payment: PaymentHistoryItem, trigger: HTMLButtonElement) => void;
}) {
  const { t } = useTranslation();
  const { locale } = useLocalization();
  const historyQuery = useCustomerPaymentHistoryQuery(customerId);
  const items = historyQuery.data?.pages.flatMap((page) => page.items) ?? [];
  const totalItems = historyQuery.data?.pages[0]?.totalItems ?? 0;
  const isInitialRetry = historyQuery.isError && historyQuery.isFetching;

  return (
    <section
      aria-busy={
        historyQuery.isPending || historyQuery.isFetchingNextPage || isInitialRetry || undefined
      }
      aria-label={t('customers.details.payments')}
      className="grid min-h-[190px] content-start gap-4 rounded-md border border-border bg-card p-4"
    >
      <h2 className="m-0 text-[0.95rem] font-black tracking-normal">
        {t('customers.details.payments')}
      </h2>

      {historyQuery.isPending ? (
        <>
          <p className="sr-only" role="status">
            {t('customers.details.paymentHistory.loading')}
          </p>
          <div aria-hidden="true" className="grid gap-3">
            {paymentSkeletonRows.map((row) => (
              <div
                className="grid gap-2 rounded-[5px] border border-border bg-background p-3"
                data-testid="payment-history-skeleton"
                key={row}
              >
                <span className="block h-5 w-1/3 rounded-[4px] bg-muted-foreground/20 motion-safe:animate-pulse" />
                <span className="block h-4 w-2/3 rounded-[4px] bg-muted-foreground/20 motion-safe:animate-pulse" />
              </div>
            ))}
          </div>
        </>
      ) : historyQuery.isError && items.length === 0 ? (
        <section
          aria-label={t('customers.details.paymentHistory.errorTitle')}
          className="grid gap-3 self-start rounded-[5px] border border-border bg-background p-4"
          role="alert"
        >
          <div className="grid gap-1">
            <h3 className="m-0 text-[0.9rem] font-black tracking-normal">
              {t('customers.details.paymentHistory.errorTitle')}
            </h3>
            <p className="m-0 text-[0.8rem] text-muted-foreground">
              {t('errors.genericDescription')}
            </p>
          </div>
          <button
            className="w-fit rounded-[5px] border border-border bg-card px-3 py-2 text-[0.78rem] font-extrabold text-foreground disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isInitialRetry}
            onClick={() => {
              void historyQuery.refetch();
            }}
            type="button"
          >
            {t('errors.retry')}
          </button>
        </section>
      ) : items.length === 0 ? (
        <div className="grid place-items-center gap-2 self-stretch rounded-[5px] border border-dashed border-border bg-background p-5 text-center text-muted-foreground">
          <CreditCard aria-hidden="true" size={22} strokeWidth={2.2} />
          <p className="m-0 text-[0.82rem] font-bold">
            {t('customers.details.paymentHistory.empty')}
          </p>
        </div>
      ) : (
        <>
          <ol className="m-0 grid list-none gap-3 p-0">
            {items.map((payment) => (
              <PaymentHistoryRow
                key={payment.id}
                locale={locale}
                onEditPayment={onEditPayment}
                payment={payment}
              />
            ))}
          </ol>
          <footer className="flex flex-wrap items-center justify-between gap-3">
            <p
              aria-live="polite"
              className="m-0 text-[0.76rem] font-bold text-muted-foreground"
            >
              {t('customers.details.paymentHistory.showing', {
                shown: items.length,
                total: totalItems,
              })}
              {!historyQuery.hasNextPage ? (
                <span className="sr-only">
                  {`. ${t('customers.details.paymentHistory.allLoaded')}`}
                </span>
              ) : null}
            </p>
            {historyQuery.isFetchNextPageError ? (
              <div
                className="flex flex-wrap items-center justify-end gap-2"
                role="alert"
              >
                <span className="text-[0.76rem] font-bold text-destructive">
                  {t('customers.details.paymentHistory.loadOlderError')}
                </span>
                <button
                  className="rounded-[5px] border border-border bg-card px-3 py-2 text-[0.78rem] font-extrabold text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={historyQuery.isFetchingNextPage}
                  onClick={() => {
                    void historyQuery.fetchNextPage();
                  }}
                  type="button"
                >
                  {t('errors.retry')}
                </button>
              </div>
            ) : (
              <button
                aria-disabled={
                  historyQuery.isFetchingNextPage || !historyQuery.hasNextPage
                }
                className="rounded-[5px] border border-border bg-card px-3 py-2 text-[0.78rem] font-extrabold text-foreground aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
                onClick={() => {
                  if (
                    historyQuery.isFetchingNextPage ||
                    !historyQuery.hasNextPage
                  ) {
                    return;
                  }

                  void historyQuery.fetchNextPage();
                }}
                type="button"
              >
                {t(
                  historyQuery.isFetchingNextPage
                    ? 'customers.details.paymentHistory.loadingOlder'
                    : historyQuery.hasNextPage
                      ? 'customers.details.paymentHistory.loadOlder'
                      : 'customers.details.paymentHistory.allLoaded',
                )}
              </button>
            )}
          </footer>
        </>
      )}
    </section>
  );
}

function PaymentHistoryRow({
  locale,
  onEditPayment,
  payment,
}: {
  locale: string;
  onEditPayment: (payment: PaymentHistoryItem, trigger: HTMLButtonElement) => void;
  payment: PaymentHistoryItem;
}) {
  const { t } = useTranslation();

  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 rounded-[5px] border border-border bg-background p-3">
      <div className="grid min-w-0 gap-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <bdi className="text-[1rem] font-black" dir="ltr">
            {formatCurrencyAmount(payment.amount, payment.currency, locale)}
          </bdi>
          <time
            className="text-[0.75rem] font-bold text-muted-foreground"
            dateTime={payment.paymentDate}
          >
            {formatDateOnly(payment.paymentDate, locale)}
          </time>
        </div>
        <div className="grid gap-1">
          <span className="truncate text-[0.86rem] font-extrabold">
            {payment.debtDescription}
          </span>
          <span className="text-[0.75rem] font-bold text-muted-foreground">
            {payment.plan.type === 'onePayment'
              ? t('customers.details.paymentHistory.onePayment')
              : t('customers.details.paymentHistory.installment', {
                  position: payment.plan.position,
                  total: payment.plan.total,
                })}
          </span>
          {payment.note ? (
            <p className="m-0 break-words whitespace-pre-wrap text-[0.78rem] text-muted-foreground">
              {payment.note}
            </p>
          ) : null}
        </div>
      </div>
      <button
        aria-label={t('customers.details.paymentHistory.editPayment')}
        className="inline-flex min-h-9 min-w-9 items-center justify-center self-start rounded-[5px] border border-border bg-card text-muted-foreground transition hover:bg-muted hover:text-foreground"
        onClick={(event) => onEditPayment(payment, event.currentTarget)}
        type="button"
      >
        <Pencil aria-hidden="true" size={15} strokeWidth={2.5} />
      </button>
    </li>
  );
}
