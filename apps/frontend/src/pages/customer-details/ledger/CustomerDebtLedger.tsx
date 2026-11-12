import { ReceiptText, Plus } from 'lucide-react';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';

import type { DebtResponse } from '@collectify/contracts';

import { useDebtDeleter, useDebtEditor } from '@/features/debts';
import { PaginationControls } from '@/shared/ui/pagination';
import { SearchField } from '@/shared/ui/search';

import { DebtCard } from './DebtCard';
import { useDebtListView } from './useDebtListView';

const debtSkeletonCards = Array.from({ length: 5 }, (_, index) => index);

export function CustomerDebtLedger({
  customerId,
  onAddDebt,
  onRecordPayment,
}: {
  customerId: string;
  onAddDebt: (trigger: HTMLButtonElement) => void;
  onRecordPayment: (debt: DebtResponse, scheduleItemId: string, trigger: HTMLButtonElement) => void;
}) {
  const { t } = useTranslation();
  const debtQuery = useDebtListView(customerId);
  const addDebtButtonRef = useRef<HTMLButtonElement>(null);
  const debtEditor = useDebtEditor({ customerId });
  const debtDeleter = useDebtDeleter({ customerId });
  const debtStatus = debtQuery.status;
  const isRetrying = debtStatus.status === 'error' && debtStatus.isRetrying;
  const isSectionBusy = debtQuery.isLoading || isRetrying;

  return (
    <>
      <section
        aria-label={t('debts.section.title')}
        aria-busy={isSectionBusy || undefined}
        className="grid min-h-[190px] gap-4 rounded-md border border-border bg-card p-4"
      >
        <header className="flex items-center justify-between gap-3">
          <h2 className="m-0 text-[0.95rem] font-black tracking-normal">
            {t('debts.section.title')}
          </h2>
          <button
            className="inline-flex min-h-9 items-center justify-center gap-2 rounded-[5px] border border-border bg-card px-3 text-[0.78rem] font-extrabold text-foreground transition duration-150 hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            onClick={(event) => onAddDebt(event.currentTarget)}
            ref={addDebtButtonRef}
            type="button"
          >
            <Plus aria-hidden="true" size={15} strokeWidth={2.6} />
            {t('customers.actions.addDebt')}
          </button>
        </header>
        <SearchField
          ariaLabel={t('debts.search.label')}
          onChange={debtQuery.search.onChange}
          placeholder={t('debts.search.placeholder')}
          value={debtQuery.search.value}
        />
        {debtStatus.status === 'error' ? (
          <section
            aria-label={t('debts.list.error.title')}
            className="grid gap-3 self-start rounded-[5px] border border-border bg-background p-4"
            role="alert"
          >
            <div className="grid gap-1">
              <h3 className="m-0 text-[0.95rem] font-black tracking-normal">
                {t('debts.list.error.title')}
              </h3>
              <p className="m-0 text-[0.86rem] text-muted-foreground">
                {t('errors.genericDescription')}
              </p>
            </div>
            <button
              className="w-fit rounded-[5px] border border-border bg-card px-3 py-2 text-[0.78rem] font-extrabold text-foreground"
              disabled={debtStatus.isRetrying}
              onClick={() => {
                void debtStatus.retry();
              }}
              type="button"
            >
              {t('errors.retry')}
            </button>
          </section>
        ) : debtQuery.isLoading ? (
          <>
            <p className="sr-only" role="status">
              {t('debts.list.loading')}
            </p>
            <div aria-hidden="true" className="grid gap-3">
              {debtSkeletonCards.map((cardIndex) => (
                <div
                  className="grid gap-3 rounded-[5px] border border-border bg-background p-3"
                  data-testid="debt-card-skeleton"
                  key={cardIndex}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="block h-4 w-2/3 rounded-[4px] bg-muted-foreground/20 motion-safe:animate-pulse" />
                    <span className="block h-4 w-20 rounded-[4px] bg-muted-foreground/20 motion-safe:animate-pulse" />
                  </div>
                  <span className="block h-4 w-1/3 rounded-[4px] bg-muted-foreground/20 motion-safe:animate-pulse" />
                  <div className="grid gap-3 border-t border-border pt-3">
                    <div className="grid grid-cols-2 gap-3">
                      <span className="block h-4 rounded-[4px] bg-muted-foreground/20 motion-safe:animate-pulse" />
                      <span className="block h-4 rounded-[4px] bg-muted-foreground/20 motion-safe:animate-pulse" />
                    </div>
                    <span className="block h-1.5 rounded-full bg-muted-foreground/20 motion-safe:animate-pulse" />
                  </div>
                  <span className="block h-4 w-1/2 rounded-[4px] bg-muted-foreground/20 motion-safe:animate-pulse" />
                </div>
              ))}
            </div>
          </>
        ) : debtQuery.data?.items.length === 0 ? (
          <div className="grid place-items-center gap-2 self-stretch rounded-[5px] border border-dashed border-border bg-background p-5 text-center text-muted-foreground">
            <ReceiptText aria-hidden="true" size={22} strokeWidth={2.2} />
            <p className="m-0 text-[0.82rem] font-bold">{t('debts.section.empty')}</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {(debtQuery.data?.items ?? []).map((debt) => (
              <DebtCard
                debt={debt}
                key={debt.id}
                onDelete={(selectedDebt, trigger) => {
                  debtDeleter.open(selectedDebt, {
                    afterDelete: () => addDebtButtonRef.current,
                    returnFocusTarget: trigger ?? addDebtButtonRef.current,
                  });
                }}
                onEdit={(selectedDebt, trigger) => {
                  debtEditor.open(selectedDebt, trigger ?? addDebtButtonRef.current);
                }}
                onRecordPayment={(selectedDebt, scheduleItemId, trigger) => {
                  const scheduleItem = selectedDebt.scheduleItems.find(
                    ({ id }) => id === scheduleItemId,
                  );

                  if (!scheduleItem || scheduleItem.paymentState === 'paid') {
                    return;
                  }

                  onRecordPayment(selectedDebt, scheduleItem.id, trigger);
                }}
              />
            ))}
          </div>
        )}
        {debtQuery.pagination.showsControls ? (
          <PaginationControls
            ariaLabel={t('debts.list.pagination.label')}
            canMoveToNextPage={debtQuery.pagination.canMoveToNextPage}
            canMoveToPreviousPage={debtQuery.pagination.canMoveToPreviousPage}
            nextPageLabel={t('debts.list.pagination.nextPage')}
            onNextPage={debtQuery.pagination.moveToNextPage}
            onPreviousPage={debtQuery.pagination.moveToPreviousPage}
            previousPageLabel={t('debts.list.pagination.previousPage')}
          />
        ) : null}
      </section>

      {debtDeleter.dialog}
      {debtEditor.dialog}
    </>
  );
}
