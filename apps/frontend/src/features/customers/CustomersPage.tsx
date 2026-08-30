import { createColumnHelper, tableFeatures, useTable } from '@tanstack/react-table';
import { MoreHorizontal, Plus } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
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
const currencyPopoverGap = 8;
const currencyPopoverEstimatedHeight = 128;
const currencyPopoverWidth = 232;

type CurrencyPopoverPosition = {
  insetInlineStart: number;
  placement: 'bottom' | 'top';
  top: number;
};

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
          cell: ({ row }) => (
            <CurrencyBalancesCell
              amountKey="remainingAmount"
              balances={row.original.financialSummary.balancesByCurrency}
              customerName={row.original.name}
              dialogLabel={t('customers.list.extraCurrencies.remainingDialogLabel', {
                name: row.original.name,
              })}
              emptyText={t('customers.list.emptyFinancial.remainingDebt')}
              multipleExtraLabelKey="customers.list.extraCurrencies.remainingAriaLabelPlural"
              singleExtraLabelKey="customers.list.extraCurrencies.remainingAriaLabel"
              title={t('customers.list.columns.remainingDebt')}
            />
          ),
        }),
        customerColumnHelper.display({
          id: 'overdueAmount',
          header: t('customers.list.columns.overdueAmount'),
          cell: ({ row }) => (
            <CurrencyBalancesCell
              amountKey="overdueAmount"
              balances={row.original.financialSummary.balancesByCurrency}
              customerName={row.original.name}
              dialogLabel={t('customers.list.extraCurrencies.overdueDialogLabel', {
                name: row.original.name,
              })}
              emptyText={t('customers.list.emptyFinancial.overdueAmount')}
              multipleExtraLabelKey="customers.list.extraCurrencies.overdueAriaLabelPlural"
              singleExtraLabelKey="customers.list.extraCurrencies.overdueAriaLabel"
              title={t('customers.list.columns.overdueAmount')}
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

function CurrencyBalancesCell({
  amountKey,
  balances,
  customerName,
  dialogLabel,
  emptyText,
  multipleExtraLabelKey,
  singleExtraLabelKey,
  title,
}: {
  amountKey: 'overdueAmount' | 'remainingAmount';
  balances: CustomerListCurrencyBalance[];
  customerName: string;
  dialogLabel: string;
  emptyText: string;
  multipleExtraLabelKey: string;
  singleExtraLabelKey: string;
  title: string;
}) {
  const { t } = useTranslation();
  const popoverId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [popoverPosition, setPopoverPosition] =
    useState<CurrencyPopoverPosition | null>(null);

  const closePopover = useCallback(() => {
    setIsPopoverOpen(false);
  }, []);

  const updatePopoverPosition = useCallback(() => {
    const trigger = triggerRef.current;

    if (!trigger) {
      return;
    }

    const triggerRect = trigger.getBoundingClientRect();
    const inlineStart =
      document.documentElement.dir === 'rtl'
        ? window.innerWidth - (triggerRect.x + triggerRect.width)
        : triggerRect.x;
    const popoverHeight =
      popoverRef.current?.getBoundingClientRect().height ??
      currencyPopoverEstimatedHeight;
    const shouldPlaceAbove =
      triggerRect.bottom + currencyPopoverGap + popoverHeight >
        window.innerHeight && triggerRect.top > popoverHeight;

    setPopoverPosition({
      insetInlineStart: Math.max(
        currencyPopoverGap,
        Math.min(
          inlineStart,
          window.innerWidth - currencyPopoverWidth - currencyPopoverGap,
        ),
      ),
      placement: shouldPlaceAbove ? 'top' : 'bottom',
      top: shouldPlaceAbove
        ? triggerRect.top - currencyPopoverGap
        : triggerRect.bottom + currencyPopoverGap,
    });
  }, []);

  useLayoutEffect(() => {
    if (!isPopoverOpen) {
      return undefined;
    }

    updatePopoverPosition();
    window.addEventListener('resize', updatePopoverPosition);
    window.addEventListener('scroll', updatePopoverPosition, true);

    return () => {
      window.removeEventListener('resize', updatePopoverPosition);
      window.removeEventListener('scroll', updatePopoverPosition, true);
    };
  }, [isPopoverOpen, updatePopoverPosition]);

  useEffect(() => {
    if (!isPopoverOpen) {
      return undefined;
    }

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closePopover();
        triggerRef.current?.focus();
      }
    };

    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      if (
        triggerRef.current?.contains(target) ||
        popoverRef.current?.contains(target)
      ) {
        return;
      }

      closePopover();
    };

    document.addEventListener('keydown', closeOnEscape);
    document.addEventListener('pointerdown', closeOnOutsidePointer);

    return () => {
      document.removeEventListener('keydown', closeOnEscape);
      document.removeEventListener('pointerdown', closeOnOutsidePointer);
    };
  }, [closePopover, isPopoverOpen]);

  if (balances.length === 0) {
    return emptyText;
  }

  const visibleBalances = balances.slice(0, 1);
  const extraBalances = balances.slice(1);
  const extraAriaLabelKey =
    extraBalances.length === 1 ? singleExtraLabelKey : multipleExtraLabelKey;
  const extraCountLabelKey =
    extraBalances.length === 1
      ? 'customers.list.extraCurrencies.countSingular'
      : 'customers.list.extraCurrencies.count';

  const togglePopover = () => {
    if (isPopoverOpen) {
      closePopover();
    } else {
      updatePopoverPosition();
      setIsPopoverOpen(true);
    }
  };

  return (
    <span className="inline-flex items-center gap-1.5">
      <span>
        {visibleBalances
          .map((balance) => formatCurrencyBalance(balance, amountKey))
          .join(', ')}
      </span>
      {extraBalances.length > 0 ? (
        <>
          <button
            aria-controls={isPopoverOpen ? popoverId : undefined}
            aria-expanded={isPopoverOpen}
            aria-haspopup="dialog"
            aria-label={t(extraAriaLabelKey, {
              count: extraBalances.length,
              name: customerName,
            })}
            className="inline-flex min-h-7 cursor-pointer items-center justify-center rounded-[5px] border border-border bg-background px-2 text-[0.72rem] font-black text-muted-foreground transition duration-150 hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            onClick={togglePopover}
            ref={triggerRef}
            type="button"
          >
            {t(extraCountLabelKey, {
              count: extraBalances.length,
            })}
          </button>
          {isPopoverOpen && popoverPosition
            ? createPortal(
                <div
                  aria-label={dialogLabel}
                  className={`fixed z-50 grid w-[232px] gap-2 rounded-[5px] border border-border bg-card p-3 text-foreground shadow-md ${
                    popoverPosition.placement === 'top'
                      ? '-translate-y-full'
                      : ''
                  }`}
                  id={popoverId}
                  ref={popoverRef}
                  role="dialog"
                  style={{
                    insetInlineStart: popoverPosition.insetInlineStart,
                    top: popoverPosition.top,
                  }}
                >
                  <h2 className="m-0 text-[0.72rem] font-black uppercase text-muted-foreground">
                    {title}
                  </h2>
                  <ul className="m-0 grid list-none gap-1 p-0">
                    {extraBalances.map((balance) => (
                      <li
                        className="grid grid-cols-[auto_1fr] items-center gap-4 text-[0.8rem]"
                        key={balance.currency}
                      >
                        <span className="font-black text-muted-foreground">
                          {balance.currency}
                        </span>
                        <span className="text-end font-black">
                          {balance[amountKey]}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>,
                document.body,
              )
            : null}
        </>
      ) : null}
    </span>
  );
}

function formatCurrencyBalance(
  balance: CustomerListCurrencyBalance,
  amountKey: 'overdueAmount' | 'remainingAmount',
): string {
  return `${balance[amountKey]} ${balance.currency}`;
}
