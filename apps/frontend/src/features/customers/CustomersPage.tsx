import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';

import {
  customerListQuerySchema,
  type CustomerListItem,
  type CustomerListQuery,
} from '@collectify/contracts';

import { CustomerCreateModal } from './CustomerCreateModal';
import {
  useCreateCustomerMutation,
  useCustomerListQuery,
} from './customerQueries';
import { CustomerTable } from './list/CustomerTable';

const emptyCustomers: CustomerListItem[] = [];

export function CustomersPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const customerListQueryParams: CustomerListQuery =
    customerListQuerySchema.parse({
      page: searchParams.get('page') ?? undefined,
    });
  const pageQuery = searchParams.get('page');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const customerListQuery = useCustomerListQuery(customerListQueryParams);
  const { createCustomer, isCreating } = useCreateCustomerMutation({
    onCreated: () => setIsCreateModalOpen(false),
  });
  const customerList = customerListQuery.data;
  const customers = customerList?.items ?? emptyCustomers;
  const hasCustomers = customers.length > 0;
  const currentPage = customerList?.page ?? customerListQueryParams.page;
  const totalPages = customerList?.totalPages ?? 0;
  const showsPagination = customerListQuery.isSuccess && totalPages > 1;
  const canMoveToPreviousPage = currentPage > 1;
  const canMoveToNextPage = currentPage < totalPages;
  const isShowingPreviousCustomerPage =
    customerListQuery.isPlaceholderData && customerListQuery.isFetching;

  useEffect(() => {
    const normalizedPage = String(customerListQueryParams.page);

    if (pageQuery === null || pageQuery === normalizedPage) {
      return;
    }

    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.set('page', normalizedPage);
    setSearchParams(nextSearchParams, { replace: true });
  }, [customerListQueryParams.page, pageQuery, searchParams, setSearchParams]);

  useEffect(() => {
    if (
      !customerListQuery.isSuccess ||
      customerListQuery.isPlaceholderData ||
      pageQuery === null
    ) {
      return;
    }

    const lastAvailablePage = totalPages > 0 ? totalPages : 1;

    if (customerListQueryParams.page <= lastAvailablePage) {
      return;
    }

    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.set('page', String(lastAvailablePage));
    setSearchParams(nextSearchParams, { replace: true });
  }, [
    customerListQuery.isPlaceholderData,
    customerListQuery.isSuccess,
    customerListQueryParams.page,
    pageQuery,
    searchParams,
    setSearchParams,
    totalPages,
  ]);

  function moveToCustomerPage(page: number) {
    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.set('page', String(page));
    setSearchParams(nextSearchParams);
  }

  return (
    <main
      aria-label={t('app.workspace.navigation.customers')}
      className="min-h-screen flex-1 bg-background p-6 text-foreground"
    >
      <div className="mx-auto grid w-full max-w-6xl gap-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="grid gap-1">
            <h1 className="m-0 text-[1.65rem] font-black leading-tight tracking-normal">
              {t('customers.page.title')}
            </h1>
            <p className="m-0 text-[0.86rem] text-muted-foreground">
              {t('customers.page.empty')}
            </p>
          </div>
          <button
            className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-[5px] border-0 bg-primary px-4 text-[0.8rem] font-extrabold text-primary-foreground transition duration-150 hover:-translate-y-px hover:brightness-95"
            onClick={() => setIsCreateModalOpen(true)}
            type="button"
          >
            <Plus aria-hidden="true" size={16} strokeWidth={2.6} />
            {t('customers.actions.create')}
          </button>
        </header>

        {customerListQuery.isLoading ? (
          <p
            className="m-0 rounded-md border border-border bg-card p-5 text-[0.86rem] font-bold text-muted-foreground"
            role="status"
          >
            {t('customers.list.loading')}
          </p>
        ) : null}

        {customerListQuery.isError ? (
          <section
            aria-label={t('customers.list.error.title')}
            className="grid gap-3 rounded-md border border-border bg-card p-5"
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
              disabled={customerListQuery.isFetching}
              onClick={() => {
                void customerListQuery.refetch();
              }}
              type="button"
            >
              {t('app.error.retry')}
            </button>
          </section>
        ) : null}

        {customerListQuery.isSuccess && !hasCustomers ? (
          <section className="rounded-md border border-dashed border-border bg-card p-8 text-center">
            <p className="m-0 text-[0.9rem] font-bold text-muted-foreground">
              {t('customers.page.empty')}
            </p>
          </section>
        ) : null}

        {hasCustomers ? (
          <div
            aria-busy={isShowingPreviousCustomerPage}
            className={
              isShowingPreviousCustomerPage
                ? 'opacity-60 transition-opacity'
                : 'transition-opacity'
            }
          >
            <CustomerTable customers={customers} />
          </div>
        ) : null}

        {showsPagination ? (
          <nav
            aria-label={t('customers.list.pagination.label')}
            className="flex items-center justify-end gap-2"
          >
            <button
              aria-label={t('customers.list.pagination.previousPage')}
              className="inline-flex size-9 cursor-pointer items-center justify-center rounded-[5px] border border-border bg-card text-muted-foreground transition duration-150 hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!canMoveToPreviousPage || customerListQuery.isFetching}
              onClick={() => moveToCustomerPage(currentPage - 1)}
              type="button"
            >
              <ChevronLeft aria-hidden="true" size={17} strokeWidth={2.5} />
            </button>
            <button
              aria-label={t('customers.list.pagination.nextPage')}
              className="inline-flex size-9 cursor-pointer items-center justify-center rounded-[5px] border border-border bg-card text-muted-foreground transition duration-150 hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!canMoveToNextPage || customerListQuery.isFetching}
              onClick={() => moveToCustomerPage(currentPage + 1)}
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
