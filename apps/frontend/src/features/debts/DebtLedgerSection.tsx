import { ReceiptText } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import type { DebtResponse } from '@collectify/contracts';

import { PaginationControls } from '../../shared/ui/pagination/PaginationControls';
import { SearchField } from '../../shared/ui/search/SearchField';
import { DebtCard } from './DebtCard';

type DebtLedgerPagination = {
  canMoveToNextPage: boolean;
  canMoveToPreviousPage: boolean;
  moveToNextPage: () => void;
  moveToPreviousPage: () => void;
  showsControls: boolean;
};

type DebtLedgerStatus =
  | { status: 'loading' }
  | {
      isRetrying: boolean;
      retry: () => unknown;
      status: 'error';
    }
  | { status: 'ready' };

const debtSkeletonCards = Array.from({ length: 5 }, (_, index) => index);

type DebtLedgerSearch = {
  onChange: (value: string) => void;
  value: string;
};

type DebtEditHandler = (
  debt: DebtResponse,
  trigger: HTMLButtonElement | null,
) => void;

type DebtDeleteHandler = (
  debt: DebtResponse,
  trigger: HTMLButtonElement | null,
) => void;

export function DebtLedgerSection({
  debts,
  isLoading = false,
  pagination,
  search,
  status,
  onDeleteDebt,
  onEditDebt,
}: {
  debts: DebtResponse[];
  isLoading?: boolean;
  onDeleteDebt?: DebtDeleteHandler;
  onEditDebt?: DebtEditHandler;
  pagination?: DebtLedgerPagination;
  search?: DebtLedgerSearch;
  status?: DebtLedgerStatus;
}) {
  const { t } = useTranslation();
  const isRetrying = status?.status === 'error' && status.isRetrying;
  const isSectionBusy = isLoading || isRetrying;

  return (
    <section
      aria-label={t('debts.section.title')}
      aria-busy={isSectionBusy || undefined}
      className="grid min-h-[190px] gap-4 rounded-md border border-border bg-card p-4"
    >
      <h2 className="m-0 text-[0.95rem] font-black tracking-normal">
        {t('debts.section.title')}
      </h2>
      {search ? (
        <SearchField
          ariaLabel={t('debts.search.label')}
          onChange={search.onChange}
          placeholder={t('debts.search.placeholder')}
          value={search.value}
        />
      ) : null}
      {status?.status === 'error' ? (
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
            disabled={status.isRetrying}
            onClick={() => {
              void status.retry();
            }}
            type="button"
          >
            {t('app.error.retry')}
          </button>
        </section>
      ) : isLoading ? (
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
      ) : debts.length === 0 ? (
        <div className="grid place-items-center gap-2 self-stretch rounded-[5px] border border-dashed border-border bg-background p-5 text-center text-muted-foreground">
          <ReceiptText aria-hidden="true" size={22} strokeWidth={2.2} />
          <p className="m-0 text-[0.82rem] font-bold">
            {t('debts.section.empty')}
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {debts.map((debt) => (
            <DebtCard
              debt={debt}
              key={debt.id}
              onDelete={onDeleteDebt}
              onEdit={onEditDebt}
            />
          ))}
        </div>
      )}
      {pagination?.showsControls ? (
        <PaginationControls
          ariaLabel={t('debts.list.pagination.label')}
          canMoveToNextPage={pagination.canMoveToNextPage}
          canMoveToPreviousPage={pagination.canMoveToPreviousPage}
          nextPageLabel={t('debts.list.pagination.nextPage')}
          onNextPage={pagination.moveToNextPage}
          onPreviousPage={pagination.moveToPreviousPage}
          previousPageLabel={t('debts.list.pagination.previousPage')}
        />
      ) : null}
    </section>
  );
}
