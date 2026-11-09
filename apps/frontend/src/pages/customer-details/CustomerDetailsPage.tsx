import { CreditCard, Pencil, Plus, type LucideIcon } from 'lucide-react';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router';

import {
  customerApiErrorCode,
  type CustomerDetailsResponse,
  type Currency,
  type DebtResponse,
} from '@collectify/contracts';
import { parseMoney } from '@collectify/domain/money';

import { useCustomerDetailsQuery } from '@/entities/customer';
import { isApiError } from '@/shared/api';
import { DebtDrawer, useCreateDebtMutation } from '@/features/debts';
import { useCustomerEditor } from '@/features/customers';
import { usePaymentRecorder } from '@/features/payments';
import { ErrorStatePage } from '@/shared/ui/error';
import { LoadingScreen } from '@/shared/ui/loading';

import { CustomerDebtLedger } from './ledger/CustomerDebtLedger';
import { CustomerFinancialSummary } from './CustomerFinancialSummary';

export function CustomerDetailsPage({ defaultCurrency }: { defaultCurrency: Currency }) {
  const { customerId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const customerQuery = useCustomerDetailsQuery(customerId);
  const customerEditor = useCustomerEditor();

  if (customerQuery.isLoading) {
    return <LoadingScreen ariaLabel={t('app.loading.ariaLabel')} />;
  }

  if (
    isApiError(customerQuery.error) &&
    customerQuery.error.code === customerApiErrorCode.customerNotFound
  ) {
    return (
      <ErrorStatePage
        actionLabel={t('customers.notFound.action')}
        detail={t('customers.notFound.detail')}
        onAction={() => navigate('/customers')}
        title={t('customers.notFound.title')}
      />
    );
  }

  if (customerQuery.isError || !customerQuery.data) {
    return (
      <ErrorStatePage
        actionLabel={t('app.error.retry')}
        detail={t('errors.genericDescription')}
        isActionPending={customerQuery.isFetching}
        onAction={() => {
          void customerQuery.refetch();
        }}
        title={t('app.error.sessionUnavailable.title')}
      />
    );
  }

  const customer = customerQuery.data;

  return (
    <>
      <CustomerDetailsContent
        customer={customer}
        defaultCurrency={defaultCurrency}
        onEditCustomer={(trigger) => customerEditor.open({ customer }, trigger)}
      />
      {customerEditor.dialog}
    </>
  );
}

function CustomerDetailsContent({
  customer,
  defaultCurrency,
  onEditCustomer,
}: {
  customer: CustomerDetailsResponse;
  defaultCurrency: Currency;
  onEditCustomer: (trigger: HTMLButtonElement) => void;
}) {
  const { t } = useTranslation();
  const [isDebtCreationOpen, setIsDebtCreationOpen] = useState(false);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const paymentRecorder = usePaymentRecorder({
    customerId: customer.id,
    customerName: customer.name,
  });
  const { createDebt, isCreating } = useCreateDebtMutation({
    customerId: customer.id,
    onCreated: () => setIsDebtCreationOpen(false),
  });
  const hasEligiblePayment = customer.financialSummary.some(
    ({ remainingAmount }) => parseMoney(remainingAmount) > 0,
  );

  const openPayment = (trigger: HTMLElement) => {
    paymentRecorder.open(undefined, trigger);
  };

  const openDebtCreation = (trigger: HTMLButtonElement) => {
    returnFocusRef.current = trigger;
    setIsDebtCreationOpen(true);
  };

  const openDebtPayment = (
    debt: DebtResponse,
    scheduleItemId: string,
    trigger: HTMLButtonElement,
  ) => {
    paymentRecorder.open({ debt, scheduleItemId }, trigger);
  };

  return (
    <>
      <main
        aria-label={customer.name}
        className="min-h-screen flex-1 bg-background p-6 text-foreground"
      >
        <div className="mx-auto grid w-full max-w-6xl gap-6">
          <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5">
            <div className="grid gap-2">
              <h1 className="m-0 text-[1.8rem] font-black leading-tight tracking-normal">
                {customer.name}
              </h1>
              <p className="m-0 inline-flex w-fit rounded-[5px] bg-muted px-2.5 py-1 text-[0.72rem] font-black text-muted-foreground">
                {t('customers.details.code')}: {customer.code}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[5px] border border-border bg-card px-4 text-[0.8rem] font-extrabold text-foreground transition duration-150 hover:bg-muted"
                onClick={(event) => onEditCustomer(event.currentTarget)}
                type="button"
              >
                <Pencil aria-hidden="true" size={16} strokeWidth={2.6} />
                {t('customers.actions.edit')}
              </button>
              <button
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[5px] border border-border bg-card px-4 text-[0.8rem] font-extrabold text-foreground transition duration-150 hover:bg-muted"
                onClick={(event) => {
                  if (hasEligiblePayment) {
                    openPayment(event.currentTarget);
                  } else {
                    openDebtCreation(event.currentTarget);
                  }
                }}
                type="button"
              >
                {hasEligiblePayment ? (
                  <CreditCard aria-hidden="true" size={16} strokeWidth={2.6} />
                ) : (
                  <Plus aria-hidden="true" size={16} strokeWidth={2.6} />
                )}
                {t(
                  hasEligiblePayment
                    ? 'customers.actions.recordPayment'
                    : 'customers.actions.addDebt',
                )}
              </button>
            </div>
          </header>

          <section className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
            <div className="grid gap-3 rounded-md border border-border bg-card p-4">
              <InfoRow label={t('customers.details.phoneNumber')} value={customer.phoneNumber} />
              <InfoRow
                label={t('customers.details.address')}
                value={customer.address ?? t('customers.details.noAddress')}
              />
            </div>

            <CustomerFinancialSummary summaries={customer.financialSummary} />
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <CustomerDebtLedger
              customerId={customer.id}
              onAddDebt={openDebtCreation}
              onRecordPayment={openDebtPayment}
            />
            <EmptyLedgerSection
              Icon={CreditCard}
              emptyText={t('customers.details.paymentsUnavailable')}
              title={t('customers.details.payments')}
            />
          </section>
        </div>
      </main>

      {paymentRecorder.dialog}
      {isDebtCreationOpen ? (
        <DebtDrawer
          defaultCurrency={defaultCurrency}
          isSubmitting={isCreating}
          onClose={() => setIsDebtCreationOpen(false)}
          onSubmit={createDebt}
          returnFocusRef={returnFocusRef}
        />
      ) : null}
    </>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1">
      <span className="text-[0.68rem] font-black text-muted-foreground">{label}</span>
      <span className="text-[0.88rem] font-bold">{value}</span>
    </div>
  );
}

function EmptyLedgerSection({
  emptyText,
  Icon,
  title,
}: {
  emptyText: string;
  Icon: LucideIcon;
  title: string;
}) {
  return (
    <section
      aria-label={title}
      className="grid min-h-[190px] gap-4 rounded-md border border-border bg-card p-4"
    >
      <h2 className="m-0 text-[0.95rem] font-black tracking-normal">{title}</h2>
      <div className="grid place-items-center gap-2 self-stretch rounded-[5px] border border-dashed border-border bg-background p-5 text-center text-muted-foreground">
        <Icon aria-hidden="true" size={22} strokeWidth={2.2} />
        <p className="m-0 text-[0.82rem] font-bold">{emptyText}</p>
      </div>
    </section>
  );
}
