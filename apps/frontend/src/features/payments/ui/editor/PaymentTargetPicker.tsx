import { ArrowLeft, ArrowRight, RefreshCw, Search } from 'lucide-react';
import { FocusScope } from '@radix-ui/react-focus-scope';
import { useEffect, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { EligiblePaymentState, PaymentTarget } from '@collectify/contracts';

import { formatCurrencyAmount, formatDateOnly, useLocalization } from '@/shared/localization';
import { useDebouncedValue } from '@/shared/useDebouncedValue';
import { PaginationControls } from '@/shared/ui/pagination';
import { SegmentedControl } from '@/shared/ui/segmented-control';
import { usePaymentTargetListQuery } from '../../model/paymentTargetQueries';

const paymentTargetSkeletonCards = [0, 1, 2];

type PaymentTargetStatusFilter = '' | EligiblePaymentState;

export function PaymentTargetPicker({
  customerId,
  onBack,
  onSelect,
}: {
  customerId: string;
  onBack?: () => void;
  onSelect: (target: PaymentTarget) => void;
}) {
  const { t } = useTranslation();
  const { metadata } = useLocalization();
  const BackIcon = metadata.direction === 'rtl' ? ArrowRight : ArrowLeft;
  const [rawSearch, setRawSearch] = useState('');
  const effectiveSearch = useDebouncedValue(rawSearch.trim());
  const [paymentState, setPaymentState] = useState<PaymentTargetStatusFilter>('');
  const [page, setPage] = useState(1);

  const targetQuery = usePaymentTargetListQuery(customerId, {
    page,
    search: effectiveSearch || undefined,
    paymentState: paymentState || undefined,
  });
  const isLoadingResults =
    targetQuery.isPending ||
    (targetQuery.isFetching &&
      (targetQuery.isPlaceholderData || targetQuery.data === undefined));

  const isDefaultView = page === 1 && !effectiveSearch && !paymentState;
  const autoSelectTarget =
    isDefaultView &&
    rawSearch.trim() === '' &&
    targetQuery.isSuccess &&
    !targetQuery.isPlaceholderData &&
    targetQuery.data.totalItems === 1
      ? targetQuery.data.items[0]
      : undefined;

  useEffect(() => {
    if (autoSelectTarget) {
      onSelect(autoSelectTarget);
    }
  }, [autoSelectTarget, onSelect]);

  const showControls =
    !isDefaultView ||
    targetQuery.isPlaceholderData ||
    (targetQuery.data?.totalItems ?? 0) > 1;
  const retry = () => {
    void targetQuery.refetch();
  };

  return (
    <div className="grid gap-3 px-6 py-[19px] max-[620px]:px-5">
      {onBack ? (
        <button
          className="flex w-fit cursor-pointer items-center gap-1.5 border-0 bg-transparent p-0 text-[0.78rem] font-extrabold text-muted-foreground transition hover:text-foreground"
          onClick={onBack}
          type="button"
        >
          <BackIcon aria-hidden="true" size={15} strokeWidth={2.4} />
          {t('payments.drawer.backToPayment')}
        </button>
      ) : null}

      <h2 className="m-0 text-[0.95rem] font-black text-foreground">
        {t('payments.drawer.selectTargetTitle')}
      </h2>

      {showControls ? (
        <PaymentTargetControls
          onPaymentStateChange={(nextPaymentState) => {
            setPage(1);
            setPaymentState(nextPaymentState);
          }}
          onSearchChange={(nextSearch) => {
            setPage(1);
            setRawSearch(nextSearch);
          }}
          paymentState={paymentState}
          rawSearch={rawSearch}
        />
      ) : null}

      {!isLoadingResults && targetQuery.data && targetQuery.data.items.length > 0 ? (
        <p
          aria-live="polite"
          className="m-0 text-[0.72rem] text-muted-foreground"
          role="status"
        >
          {t('payments.drawer.targetRange', {
            end:
              (targetQuery.data.page - 1) * targetQuery.data.pageSize +
              targetQuery.data.items.length,
            start: (targetQuery.data.page - 1) * targetQuery.data.pageSize + 1,
            total: targetQuery.data.totalItems,
          })}
        </p>
      ) : null}

      {isLoadingResults ? (
        <PaymentTargetPickerSkeleton />
      ) : targetQuery.isError ? (
        <PaymentTargetError onRetry={retry} />
      ) : targetQuery.data?.items.length === 0 ? (
        <div
          className="rounded-[5px] border border-dashed border-border bg-background p-5 text-center"
          role="status"
        >
          <p className="m-0 text-[0.82rem] font-bold text-muted-foreground">
            {t('payments.drawer.noTargets')}
          </p>
        </div>
      ) : targetQuery.data ? (
        <TargetOptions onSelect={onSelect} targets={targetQuery.data.items} />
      ) : null}

      {targetQuery.data && targetQuery.data.totalPages > 1 ? (
        <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
          <span className="text-[0.76rem] font-bold text-muted-foreground">
            {t('payments.drawer.pageStatus', {
              page,
              totalPages: targetQuery.data.totalPages,
            })}
          </span>
          <PaginationControls
            ariaLabel={t('payments.drawer.paginationLabel')}
            canMoveToNextPage={page < targetQuery.data.totalPages}
            canMoveToPreviousPage={page > 1}
            isDisabled={targetQuery.isFetching}
            nextPageLabel={t('payments.drawer.nextPage')}
            onNextPage={() => {
              setPage((currentPage) =>
                Math.min(targetQuery.data?.totalPages ?? currentPage, currentPage + 1),
              );
            }}
            onPreviousPage={() => {
              setPage((currentPage) => Math.max(1, currentPage - 1));
            }}
            previousPageLabel={t('payments.drawer.previousPage')}
          />
        </div>
      ) : null}
    </div>
  );
}

function PaymentTargetControls({
  onPaymentStateChange,
  onSearchChange,
  paymentState,
  rawSearch,
}: {
  onPaymentStateChange: (paymentState: PaymentTargetStatusFilter) => void;
  onSearchChange: (search: string) => void;
  paymentState: PaymentTargetStatusFilter;
  rawSearch: string;
}) {
  const { t } = useTranslation();
  const searchId = useId();

  return (
    <div className="grid gap-3">
      <div className="relative flex min-h-10 items-center rounded-[5px] border border-border bg-background focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15">
        <label className="sr-only" htmlFor={searchId}>
          {t('payments.drawer.searchDebtDescriptions')}
        </label>
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute start-3 text-muted-foreground"
          size={16}
          strokeWidth={2}
        />
        <input
          autoFocus
          autoComplete="off"
          className="min-h-10 w-full border-0 bg-transparent pe-3 ps-10 text-[0.8rem] text-foreground outline-none placeholder:text-muted-foreground/80"
          id={searchId}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={t('payments.drawer.searchDebtDescriptions')}
          type="search"
          value={rawSearch}
        />
      </div>
      <SegmentedControl
        ariaLabel={t('payments.drawer.paymentStatus')}
        onChange={onPaymentStateChange}
        options={[
          { label: t('payments.drawer.allTargets'), value: '' },
          { label: t('payments.drawer.paymentStateUnpaid'), value: 'unpaid' },
          {
            label: t('payments.drawer.paymentStatePartiallyPaid'),
            value: 'partiallyPaid',
          },
        ]}
        value={paymentState}
      />
    </div>
  );
}

function PaymentTargetPickerSkeleton() {
  const { t } = useTranslation();

  return (
    <div className="grid gap-3">
      <p aria-label={t('payments.drawer.loadingTargets')} className="sr-only" role="status">
        {t('payments.drawer.loadingTargets')}
      </p>
      <div aria-hidden="true" className="grid gap-3">
        <div className="overflow-hidden rounded-[5px] border border-border bg-card">
          <div className="flex min-h-[38px] items-center border-b border-border bg-muted/50 px-3 py-2">
            <span className="h-3 w-36 rounded-[4px] bg-muted-foreground/20 motion-safe:animate-pulse" />
          </div>
          {paymentTargetSkeletonCards.map((cardIndex) => (
            <div
              className="flex min-h-[58px] items-center justify-between gap-3 border-b border-border px-3 py-2 last:border-b-0"
              key={cardIndex}
            >
              <div className="grid min-w-0 flex-1 gap-1.5">
                <span className="h-3.5 w-28 rounded-[4px] bg-muted-foreground/20 motion-safe:animate-pulse" />
                <span className="h-3 w-40 max-w-full rounded-[4px] bg-muted-foreground/20 motion-safe:animate-pulse" />
              </div>
              <div className="grid shrink-0 justify-items-end gap-1.5">
                <span className="h-3.5 w-20 rounded-[4px] bg-muted-foreground/20 motion-safe:animate-pulse" />
                <span className="h-3 w-16 rounded-[4px] bg-muted-foreground/20 motion-safe:animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PaymentTargetError({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation();

  return (
    <FocusScope asChild>
      <section
        aria-label={t('payments.drawer.targetLoadErrorTitle')}
        className="grid gap-3 self-start rounded-[5px] border border-border bg-background p-4"
        role="alert"
      >
        <h3 className="m-0 text-[0.95rem] font-black tracking-normal">
          {t('payments.drawer.targetLoadErrorTitle')}
        </h3>
        <button
          className="inline-flex w-fit items-center gap-2 rounded-[5px] border border-border bg-card px-3 py-2 text-[0.78rem] font-extrabold text-foreground transition hover:bg-muted"
          onClick={onRetry}
          type="button"
        >
          <RefreshCw aria-hidden="true" size={15} strokeWidth={2.4} />
          {t('errors.retry')}
        </button>
      </section>
    </FocusScope>
  );
}

const timingLabelKeys = {
  overdue: 'payments.drawer.timingOverdue',
  dueToday: 'payments.drawer.timingDueToday',
  upcoming: 'payments.drawer.timingUpcoming',
} satisfies Record<PaymentTarget['timing'], string>;

const paymentStateLabelKeys = {
  partiallyPaid: 'payments.drawer.paymentStatePartiallyPaid',
  unpaid: 'payments.drawer.paymentStateUnpaid',
} satisfies Record<PaymentTarget['paymentState'], string>;

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
    <div className="grid gap-3">
      {Array.from(groups, ([debtId, group], groupIndex) => {
        const headingId = `${groupIdPrefix}-debt-${groupIndex}`;

        return (
          <div
            aria-labelledby={headingId}
            className="overflow-hidden rounded-[5px] border border-border bg-card"
            key={debtId}
            role="group"
          >
            <h3
              className="m-0 flex min-h-[38px] items-center border-b border-border bg-muted/50 px-3 py-2 text-[0.76rem] font-black text-foreground"
              id={headingId}
            >
              {group.debtDescription}
            </h3>
            <div className="grid">
              {group.targets.map((target) => {
                const planLabel =
                  target.plan.type === 'installment'
                    ? t('payments.drawer.installmentLabel', { position: target.plan.position })
                    : t('payments.drawer.onePaymentTarget');
                const timingLabel = t(timingLabelKeys[target.timing]);
                const paymentStateLabel = t(paymentStateLabelKeys[target.paymentState]);

                return (
                  <button
                    className="flex min-h-[58px] w-full cursor-pointer items-center justify-between gap-3 border-0 border-b border-border bg-card px-3 py-2 text-start text-foreground transition last:border-b-0 hover:bg-muted"
                    key={target.scheduleItemId}
                    onClick={() => onSelect(target)}
                    type="button"
                  >
                    <span className="sr-only">{target.debtDescription}, </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[0.78rem] font-extrabold">
                        {planLabel}
                      </span>
                      <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[0.7rem] font-bold text-muted-foreground">
                        <span>
                          {t('payments.drawer.dueDateLabel')}:{' '}
                          {formatDateOnly(target.dueDate, locale)}
                        </span>
                        {target.timing === 'overdue' ? (
                          <span className="inline-flex rounded-[3px] bg-status-overdue-background px-1.5 py-px text-[0.66rem] font-extrabold text-status-overdue-foreground">
                            {timingLabel}
                          </span>
                        ) : (
                          <span>· {timingLabel}</span>
                        )}
                      </span>
                    </span>
                    <span className="shrink-0 text-end">
                      <bdi className="block text-[0.78rem] font-black" dir="ltr">
                        {formatCurrencyAmount(target.remainingAmount, target.currency, locale)}
                      </bdi>
                      <span className="mt-0.5 block text-[0.68rem] text-muted-foreground">
                        {paymentStateLabel}
                      </span>
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
