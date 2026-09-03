import { ChevronLeft, ChevronRight, Plus, Search } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { CustomerCreateModal } from './CustomerCreateModal';
import { useCreateCustomerMutation } from './customerQueries';
import { CustomerTable } from './list/CustomerTable';
import { useCustomerListView } from './useCustomerListView';

export function CustomersPage() {
  const { t } = useTranslation();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { customers, pagination, search, status } = useCustomerListView();
  const { createCustomer, isCreating } = useCreateCustomerMutation({
    onCreated: () => setIsCreateModalOpen(false),
  });
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
              {t('customers.page.title')}
            </h1>
            <p className="m-0 text-[0.86rem] text-muted-foreground">
              {t('customers.page.empty')}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-3">
            <label className="relative block min-w-[min(100%,16rem)]">
              <span className="sr-only">{t('customers.search.label')}</span>
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                size={16}
                strokeWidth={2.4}
              />
              <input
                aria-label={t('customers.search.label')}
                className="min-h-10 w-full rounded-[5px] border border-border bg-card px-9 text-[0.82rem] font-bold text-foreground outline-none transition placeholder:text-muted-foreground/70 focus:border-ring focus:ring-2 focus:ring-ring/25"
                onChange={(event) => search.onChange(event.target.value)}
                placeholder={t('customers.search.placeholder')}
                type="search"
                value={search.value}
              />
            </label>
            <button
              className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-[5px] border-0 bg-primary px-4 text-[0.8rem] font-extrabold text-primary-foreground transition duration-150 hover:-translate-y-px hover:brightness-95"
              onClick={() => setIsCreateModalOpen(true)}
              type="button"
            >
              <Plus aria-hidden="true" size={16} strokeWidth={2.6} />
              {t('customers.actions.create')}
            </button>
          </div>
        </header>

        {status.status === 'loading' ? (
          <p
            className="sr-only"
            role="status"
          >
            {t('customers.list.loading')}
          </p>
        ) : null}

        {status.status === 'error' ? (
          <section
            aria-label={t('customers.list.error.title')}
            className="grid self-start gap-3 rounded-md border border-border bg-card p-5"
            role="alert"
          >
            <div className="grid gap-1">
              <h2 className="m-0 text-[1rem] font-black tracking-normal">
                {t('customers.list.error.title')}
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
              {t('customers.page.empty')}
            </p>
          </section>
        ) : null}

        {showsCustomerTable ? (
          <div className="min-h-0 transition-opacity">
            <CustomerTable customers={customers} isLoading={isTableLoading} />
          </div>
        ) : null}

        {pagination.showsControls ? (
          <nav
            aria-label={t('customers.list.pagination.label')}
            className="flex items-center justify-end gap-2"
          >
            <button
              aria-label={t('customers.list.pagination.previousPage')}
              className="inline-flex size-9 cursor-pointer items-center justify-center rounded-[5px] border border-border bg-card text-muted-foreground transition duration-150 hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!pagination.canMoveToPreviousPage}
              onClick={pagination.moveToPreviousPage}
              type="button"
            >
              <ChevronLeft aria-hidden="true" size={17} strokeWidth={2.5} />
            </button>
            <button
              aria-label={t('customers.list.pagination.nextPage')}
              className="inline-flex size-9 cursor-pointer items-center justify-center rounded-[5px] border border-border bg-card text-muted-foreground transition duration-150 hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!pagination.canMoveToNextPage}
              onClick={pagination.moveToNextPage}
              type="button"
            >
              <ChevronRight aria-hidden="true" size={17} strokeWidth={2.5} />
            </button>
          </nav>
        ) : null}
      </div>

      {isCreateModalOpen ? (
        <CustomerCreateModal
          isSubmitting={isCreating}
          onClose={() => setIsCreateModalOpen(false)}
          onSubmit={createCustomer}
        />
      ) : null}
    </main>
  );
}
