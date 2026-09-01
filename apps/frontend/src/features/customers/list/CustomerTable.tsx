import { createColumnHelper, tableFeatures, useTable } from '@tanstack/react-table';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import type { CustomerListItem } from '@collectify/contracts';

import { CustomerActionsCell } from './CustomerActionsCell';
import { CurrencyBalancesCell } from './CurrencyBalancesCell';

const customerTableFeatures = tableFeatures({});
const customerColumnHelper = createColumnHelper<
  typeof customerTableFeatures,
  CustomerListItem
>();

type CustomerTableProps = {
  customers: CustomerListItem[];
};

export function CustomerTable({ customers }: CustomerTableProps) {
  const { t } = useTranslation();
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
          cell: ({ row }) => (
            <CurrencyBalancesCell
              customer={row.original}
              variant="remainingDebt"
            />
          ),
        }),
        customerColumnHelper.display({
          id: 'overdueAmount',
          header: t('customers.list.columns.overdueAmount'),
          cell: ({ row }) => (
            <CurrencyBalancesCell
              customer={row.original}
              variant="overdueAmount"
            />
          ),
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
            <CustomerActionsCell
              customerId={row.original.id}
              customerName={row.original.name}
            />
          ),
        }),
      ]),
    [t],
  );
  const customerTable = useTable({
    features: customerTableFeatures,
    columns: customerColumns,
    data: customers,
    getRowId: (customer) => customer.id,
  });

  return (
    <section className="h-full min-h-0 overflow-hidden rounded-md border border-border bg-card">
      <div className="h-full overflow-auto">
        <table className="min-w-full border-collapse text-start text-[0.84rem]">
          <thead className="sticky top-0 z-10 bg-muted text-muted-foreground">
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
  );
}
