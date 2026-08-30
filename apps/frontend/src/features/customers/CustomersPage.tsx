import { createColumnHelper, tableFeatures, useTable } from '@tanstack/react-table';
import { MoreHorizontal, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type {
  CustomerListCurrencyBalance,
  CustomerListItem,
} from '@collectify/contracts';

import { CustomerCreateModal } from './CustomerCreateModal';
import {
  useCreateCustomerMutation,
  useCustomerListQuery,
} from './customerQueries';

const customerTableFeatures = tableFeatures({});
const customerColumnHelper = createColumnHelper<
  typeof customerTableFeatures,
  CustomerListItem
>();
const emptyCustomers: CustomerListItem[] = [];

export function CustomersPage() {
  const { t } = useTranslation();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const customerListQuery = useCustomerListQuery();
  const { createCustomer, isCreating } = useCreateCustomerMutation({
    onCreated: () => setIsCreateModalOpen(false),
  });
  const customerColumns = useMemo(
    () =>
      customerColumnHelper.columns([
        customerColumnHelper.accessor('name', {
          header: t('customers.list.columns.name'),
        }),
        customerColumnHelper.accessor('code', {
          header: t('customers.list.columns.code'),
        }),
        customerColumnHelper.accessor('phoneNumber', {
          header: t('customers.list.columns.phone'),
        }),
        customerColumnHelper.display({
          id: 'remainingDebt',
          header: t('customers.list.columns.remainingDebt'),
          cell: ({ row }) =>
            formatCurrencyBalances({
              balances: row.original.financialSummary.balancesByCurrency,
              amountKey: 'remainingAmount',
              emptyText: t('customers.list.emptyFinancial.remainingDebt'),
            }),
        }),
        customerColumnHelper.display({
          id: 'overdueAmount',
          header: t('customers.list.columns.overdueAmount'),
          cell: ({ row }) =>
            formatCurrencyBalances({
              balances: row.original.financialSummary.balancesByCurrency,
              amountKey: 'overdueAmount',
              emptyText: t('customers.list.emptyFinancial.overdueAmount'),
            }),
        }),
        customerColumnHelper.display({
          id: 'nextDueDate',
          header: t('customers.list.columns.nextDueDate'),
          cell: ({ row }) =>
            row.original.financialSummary.nextDueDate ??
            t('customers.list.emptyFinancial.nextDueDate'),
        }),
        customerColumnHelper.display({
          id: 'actions',
          header: t('customers.list.columns.actions'),
          cell: ({ row }) => (
            <button
              aria-label={t('customers.list.actions.openMenu', {
                name: row.original.name,
              })}
              className="inline-flex size-8 cursor-pointer items-center justify-center rounded-[5px] border border-border bg-card text-muted-foreground transition duration-150 hover:bg-muted hover:text-foreground"
              type="button"
            >
              <MoreHorizontal aria-hidden="true" size={17} strokeWidth={2.5} />
            </button>
          ),
        }),
      ]),
    [t],
  );
  const customerTable = useTable({
    features: customerTableFeatures,
    columns: customerColumns,
    data: customerListQuery.data?.items ?? emptyCustomers,
    getRowId: (customer) => customer.id,
  });

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

        {customerListQuery.isSuccess &&
        customerTable.getRowModel().rows.length === 0 ? (
          <section className="rounded-md border border-dashed border-border bg-card p-8 text-center">
            <p className="m-0 text-[0.9rem] font-bold text-muted-foreground">
              {t('customers.page.empty')}
            </p>
          </section>
        ) : null}

        {customerTable.getRowModel().rows.length > 0 ? (
          <section className="overflow-hidden rounded-md border border-border bg-card">
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-start text-[0.84rem]">
                <thead className="bg-muted text-muted-foreground">
                  {customerTable.getHeaderGroups().map((headerGroup) => (
                    <tr key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <th
                          className="whitespace-nowrap border-b border-border px-4 py-3 text-start text-[0.68rem] font-black uppercase"
                          key={header.id}
                          scope="col"
                        >
                          {header.isPlaceholder ? null : (
                            <customerTable.FlexRender header={header} />
                          )}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {customerTable.getRowModel().rows.map((row) => (
                    <tr className="border-b border-border last:border-b-0" key={row.id}>
                      {row.getAllCells().map((cell) => (
                        <td className="whitespace-nowrap px-4 py-3 font-bold" key={cell.id}>
                          <customerTable.FlexRender cell={cell} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
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

function formatCurrencyBalances({
  amountKey,
  balances,
  emptyText,
}: {
  amountKey: 'overdueAmount' | 'remainingAmount';
  balances: CustomerListCurrencyBalance[];
  emptyText: string;
}): string {
  if (balances.length === 0) {
    return emptyText;
  }

  return balances
    .slice(0, 2)
    .map((balance) => `${balance[amountKey]} ${balance.currency}`)
    .join(', ');
}
