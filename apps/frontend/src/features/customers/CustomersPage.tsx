import { Plus } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';

import {
  customerListQuerySchema,
  type CustomerListItem,
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
  const [searchParams] = useSearchParams();
  const customerListQueryParams = customerListQuerySchema.parse({
    page: searchParams.get('page') ?? undefined,
  });
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const customerListQuery = useCustomerListQuery(customerListQueryParams);
  const { createCustomer, isCreating } = useCreateCustomerMutation({
    onCreated: () => setIsCreateModalOpen(false),
  });
  const customers = customerListQuery.data?.items ?? emptyCustomers;
  const hasCustomers = customers.length > 0;

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

        {hasCustomers ? <CustomerTable customers={customers} /> : null}
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
