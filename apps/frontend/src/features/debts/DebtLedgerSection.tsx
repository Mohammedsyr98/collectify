import { ReceiptText } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import type { DebtResponse } from '@collectify/contracts';

import { PaginationControls } from '../../shared/ui/pagination/PaginationControls';
import { DebtCard } from './DebtCard';

type DebtLedgerPagination = {
  canMoveToNextPage: boolean;
  canMoveToPreviousPage: boolean;
  moveToNextPage: () => void;
  moveToPreviousPage: () => void;
  showsControls: boolean;
};

const debtSkeletonCards = Array.from({ length: 5 }, (_, index) => index);

export function DebtLedgerSection({
  debts,
  isLoading = false,
  pagination,
}: {
  debts: DebtResponse[];
  isLoading?: boolean;
  pagination?: DebtLedgerPagination;
}) {
  const { t } = useTranslation();

  return (
    <section
      aria-label={t('debts.section.title')}
      aria-busy={isLoading || undefined}
      className="grid min-h-[190px] gap-4 rounded-md border border-border bg-card p-4"
    >
      <h2 className="m-0 text-[0.95rem] font-black tracking-normal">
        {t('debts.section.title')}
      </h2>
      {isLoading ? (
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
            <DebtCard debt={debt} key={debt.id} />
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
