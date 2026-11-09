import { Plus } from 'lucide-react';
import { useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { useCustomerCreator, useCustomerEditor } from '@/features/customers';
import { PaginationControls } from '@/shared/ui/pagination';
import { SearchField } from '@/shared/ui/search';

import { CustomerTable } from './list/CustomerTable';
import { useCustomerListView } from './useCustomerListView';

export function CustomersPage() {
  const { t } = useTranslation();
  const createCustomerButtonRef = useRef<HTMLButtonElement>(null);
  const { dialog: customerCreatorDialog, open: openCustomerCreator } =
    useCustomerCreator();
  const {
    dialog: customerEditorDialog,
    open: openCustomerEditorSession,
    prefetch: prefetchCustomerEditor,
  } = useCustomerEditor();
  const { customers, pagination, search, status } = useCustomerListView();
  const openCustomerEditor = useCallback(
    (customerId: string, returnFocusTarget: HTMLButtonElement | null) => {
      openCustomerEditorSession({ customerId }, returnFocusTarget);
    },
    [openCustomerEditorSession],
  );
  const isTableLoading = status.status === 'loading';
  const showsCustomerTable = isTableLoading || status.status === 'ready';

  return (
    <main
      aria-label={t('app.workspace.navigation.customers')}
      className="h-screen min-h-0 flex-1 overflow-hidden bg-background p-6 text-foreground"
    >
      <div className="mx-auto grid h-full min-h-0 w-full max-w-6xl grid-rows-[auto_minmax(0,1fr)_auto] gap-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="grid gap-1">
            <h1 className="m-0 text-[1.65rem] font-black leading-tight tracking-normal">
              {t('customerDirectory.page.title')}
            </h1>
            <p className="m-0 text-[0.86rem] text-muted-foreground">
              {t('customerDirectory.page.empty')}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-3">
            <SearchField
              ariaLabel={t('customerDirectory.search.label')}
              className="min-w-[min(100%,16rem)]"
              onChange={search.onChange}
              placeholder={t('customerDirectory.search.placeholder')}
              value={search.value}
            />
            <button
              className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-[5px] border-0 bg-primary px-4 text-[0.8rem] font-extrabold text-primary-foreground transition duration-150 hover:-translate-y-px hover:brightness-95"
              onClick={() => openCustomerCreator(createCustomerButtonRef.current)}
              ref={createCustomerButtonRef}
              type="button"
            >
              <Plus aria-hidden="true" size={16} strokeWidth={2.6} />
              {t('customerDirectory.actions.create')}
            </button>
          </div>
        </header>

        {status.status === 'loading' ? (
          <p
            className="sr-only"
            role="status"
          >
            {t('customerDirectory.list.loading')}
          </p>
        ) : null}

        {status.status === 'error' ? (
          <section
            aria-label={t('customerDirectory.list.error.title')}
            className="grid self-start gap-3 rounded-md border border-border bg-card p-5"
            role="alert"
          >
            <div className="grid gap-1">
              <h2 className="m-0 text-[1rem] font-black tracking-normal">
                {t('customerDirectory.list.error.title')}
              </h2>
              <p className="m-0 text-[0.86rem] text-muted-foreground">
                {t('errors.genericDescription')}
              </p>
            </div>
            <button
              className="w-fit rounded-[5px] border border-border bg-background px-3 py-2 text-[0.78rem] font-extrabold text-foreground"
              disabled={status.isRetrying}
              onClick={() => {
                void status.retry();
              }}
              type="button"
            >
              {t('app.error.retry')}
            </button>
          </section>
        ) : null}

        {status.status === 'empty' ? (
          <section className="self-start rounded-md border border-dashed border-border bg-card p-8 text-center">
            <p className="m-0 text-[0.9rem] font-bold text-muted-foreground">
              {t('customerDirectory.page.empty')}
            </p>
          </section>
        ) : null}

        {showsCustomerTable ? (
          <div className="min-h-0 transition-opacity">
            <CustomerTable
              customers={customers}
              isLoading={isTableLoading}
              onEditCustomer={openCustomerEditor}
              onPrefetchEditCustomer={prefetchCustomerEditor}
            />
          </div>
        ) : null}

        {pagination.showsControls ? (
          <PaginationControls
            ariaLabel={t('customerDirectory.list.pagination.label')}
            canMoveToNextPage={pagination.canMoveToNextPage}
            canMoveToPreviousPage={pagination.canMoveToPreviousPage}
            nextPageLabel={t('customerDirectory.list.pagination.nextPage')}
            onNextPage={pagination.moveToNextPage}
            onPreviousPage={pagination.moveToPreviousPage}
            previousPageLabel={t('customerDirectory.list.pagination.previousPage')}
          />
        ) : null}
      </div>

      {customerCreatorDialog}
      {customerEditorDialog}
    </main>
  );
}
