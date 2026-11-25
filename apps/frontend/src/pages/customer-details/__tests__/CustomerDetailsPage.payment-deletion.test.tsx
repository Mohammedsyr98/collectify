import '@testing-library/jest-dom/vitest';
import { cleanup, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type {
  CustomerDetailsResponse,
  DeletePaymentRequest,
  DeletePaymentResponse,
  DebtResponse,
  PaymentHistoryItem,
  PaymentHistoryListResponse,
} from '@collectify/contracts';

import { getBackendUrl } from '@/shared/api';
import { server } from '@/shared/test';
import { paymentResources } from '@/features/payments';
import { customerDetailsResources } from '../localization/resources';
import { baseCustomer, resetCustomerTestEnvironment } from './customerDetailsTestData';
import { createDebtFixture, emptyDebtList } from './debtTestData';
import { renderCustomerRoutes } from './renderCustomerRoutes';

const payment: PaymentHistoryItem = {
  id: 'payment_to_delete',
  scheduleItemId: 'schedule_to_delete',
  debtId: 'debt_to_delete',
  debtDescription: 'Office equipment',
  debtVersion: 4,
  amount: '25.00',
  maximumReplacementAmount: '75.00',
  paymentStateAfterDeletion: 'partiallyPaid',
  currency: 'USD',
  paymentDate: '2026-10-20',
  note: null,
  plan: { type: 'installment', position: 2, total: 4 },
};

const remainingPayment: PaymentHistoryItem = {
  ...payment,
  id: 'payment_that_remains',
  amount: '25.00',
  maximumReplacementAmount: '100.00',
  paymentStateAfterDeletion: 'unpaid',
  plan: { type: 'installment', position: 2, total: 4 },
};

const customerBeforeDeletion: CustomerDetailsResponse = {
  ...baseCustomer,
  financialSummary: [
    {
      currency: 'USD',
      totalDebtAmount: '100.00',
      totalPaidAmount: '50.00',
      remainingAmount: '50.00',
    },
  ],
};

const customerAfterDeletion: CustomerDetailsResponse = {
  ...customerBeforeDeletion,
  financialSummary: [
    {
      currency: 'USD',
      totalDebtAmount: '100.00',
      totalPaidAmount: '25.00',
      remainingAmount: '75.00',
    },
  ],
};

const debtAfterDeletion: DebtResponse = createDebtFixture(baseCustomer.id, {
  id: payment.debtId,
  description: payment.debtDescription,
  totalAmount: '100.00',
  paidAmount: '25.00',
  remainingAmount: '75.00',
  paymentState: 'partiallyPaid',
  paymentCount: 1,
  version: 5,
  scheduleItems: [
    {
      id: payment.scheduleItemId,
      position: 1,
      amount: '100.00',
      paidAmount: '25.00',
      remainingAmount: '75.00',
      paymentState: 'partiallyPaid',
      paymentCount: 1,
      dueDate: '2026-10-30',
      timing: 'overdue',
    },
  ],
});

const deleteResponse: DeletePaymentResponse = {
  deletedPaymentId: payment.id,
  debt: debtAfterDeletion,
  customerFinancialSummary: customerAfterDeletion.financialSummary,
};

describe('CustomerDetailsPage payment deletion', () => {
  beforeEach(() => {
    resetCustomerTestEnvironment();
  });

  afterEach(() => cleanup());

  it('previews the projected target state and refreshes the page after permanent deletion', async () => {
    const user = userEvent.setup();
    let wasDeleted = false;
    let receivedRequest: DeletePaymentRequest | undefined;

    server.use(
      http.get(`${getBackendUrl()}/customers/:customerId`, () =>
        HttpResponse.json(wasDeleted ? customerAfterDeletion : customerBeforeDeletion),
      ),
      http.get(`${getBackendUrl()}/customers/:customerId/debts`, () =>
        HttpResponse.json(
          wasDeleted
            ? {
                items: [debtAfterDeletion],
                page: 1,
                pageSize: 5,
                totalItems: 1,
                totalPages: 1,
              }
            : emptyDebtList,
        ),
      ),
      http.get(`${getBackendUrl()}/customers/:customerId/payments`, () =>
        HttpResponse.json({
          items: wasDeleted ? [remainingPayment] : [payment],
          pageSize: 10,
          totalItems: wasDeleted ? 1 : 2,
          nextCursor: null,
        } satisfies PaymentHistoryListResponse),
      ),
      http.delete(
        `${getBackendUrl()}/customers/:customerId/payments/:paymentId`,
        async ({ request }) => {
          receivedRequest = (await request.json()) as DeletePaymentRequest;
          wasDeleted = true;
          return HttpResponse.json(deleteResponse);
        },
      ),
    );

    renderCustomerRoutes([`/customers/${baseCustomer.id}`]);

    const history = await screen.findByRole('region', {
      name: customerDetailsResources.en.common.customers.details.payments,
    });
    const row = await within(history).findByRole('listitem');
    const deleteTrigger = within(row).getByRole('button', { name: 'Delete payment' });
    await user.click(deleteTrigger);

    const dialog = await screen.findByRole('dialog', {
      name: 'Delete this payment permanently?',
    });
    expect(dialog).toHaveTextContent('$25.00');
    expect(dialog).toHaveTextContent('October 20, 2026');
    expect(dialog).toHaveTextContent('Office equipment');
    expect(dialog).toHaveTextContent('Installment 2 of 4');
    expect(dialog).toHaveTextContent('$75.00');
    expect(dialog).toHaveTextContent('Partially paid');
    expect(within(dialog).getByRole('button', { name: 'Keep payment' })).toHaveFocus();

    await user.click(within(dialog).getByRole('button', { name: 'Keep payment' }));
    expect(deleteTrigger).toHaveFocus();
    await user.click(deleteTrigger);

    const reopenedDialog = await screen.findByRole('dialog', {
      name: 'Delete this payment permanently?',
    });
    await user.click(within(reopenedDialog).getByRole('button', { name: 'Delete payment' }));

    await waitFor(() => expect(receivedRequest).toEqual({ expectedDebtVersion: 4 }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(await within(history).findByText('Showing 1 of 1')).toBeInTheDocument();
    expect(within(history).getAllByRole('listitem')).toHaveLength(1);
    const financialSummary = screen.getByRole('region', { name: 'Financial summary' });
    expect(within(financialSummary).getByText('$75.00')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Payments' })).toHaveFocus();
    expect(
      await screen.findByRole('status', { name: 'Payment deleted' }),
    ).toHaveTextContent('Installment 2 of 4 remaining: $75.00. Status: Partially paid.');
  });

  it('keeps a stale preview open after a conflict and requires reopening before retrying', async () => {
    const user = userEvent.setup();
    let currentPayment = payment;
    let historyReads = 0;
    const refreshedPayment = {
      ...payment,
      debtVersion: 5,
      maximumReplacementAmount: '65.00',
    } satisfies PaymentHistoryItem;

    serveInitialPage(() => currentPayment, () => {
      historyReads += 1;
    });
    server.use(
      http.delete(
        `${getBackendUrl()}/customers/:customerId/payments/:paymentId`,
        () => {
          currentPayment = refreshedPayment;
          return HttpResponse.json(
            {
              code: 'PAYMENT_DEBT_VERSION_CONFLICT',
              message: 'The debt changed.',
            },
            { status: 409 },
          );
        },
      ),
    );

    renderCustomerRoutes([`/customers/${baseCustomer.id}`]);
    const history = await screen.findByRole('region', { name: 'Payments' });
    const row = await within(history).findByRole('listitem');
    const deleteTrigger = within(row).getByRole('button', { name: 'Delete payment' });
    await user.click(deleteTrigger);

    let dialog = await screen.findByRole('dialog', {
      name: 'Delete this payment permanently?',
    });
    await user.click(within(dialog).getByRole('button', { name: 'Delete payment' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      paymentResources.en.common.payments.delete.failure.stale,
    );
    expect(within(dialog).getByRole('button', { name: 'Delete payment' })).toBeDisabled();
    await waitFor(() => expect(historyReads).toBeGreaterThan(1));

    await user.click(within(dialog).getByRole('button', { name: 'Keep payment' }));
    expect(deleteTrigger).toHaveFocus();
    await user.click(deleteTrigger);
    dialog = await screen.findByRole('dialog', {
      name: 'Delete this payment permanently?',
    });
    expect(dialog).toHaveTextContent('$65.00');
    await user.click(within(dialog).getByRole('button', { name: 'Keep payment' }));
  });

  it('blocks both actions and Escape while deletion is pending', async () => {
    const user = userEvent.setup();
    let finishDelete: (() => void) | undefined;
    const waitForDelete = new Promise<void>((resolve) => {
      finishDelete = resolve;
    });
    serveInitialPage(() => payment);
    server.use(
      http.delete(
        `${getBackendUrl()}/customers/:customerId/payments/:paymentId`,
        async () => {
          await waitForDelete;
          return HttpResponse.json(deleteResponse);
        },
      ),
    );

    renderCustomerRoutes([`/customers/${baseCustomer.id}`]);
    const history = await screen.findByRole('region', { name: 'Payments' });
    const row = await within(history).findByRole('listitem');
    await user.click(within(row).getByRole('button', { name: 'Delete payment' }));
    const dialog = await screen.findByRole('dialog', {
      name: 'Delete this payment permanently?',
    });
    await user.click(within(dialog).getByRole('button', { name: 'Delete payment' }));

    expect(await within(dialog).findByRole('status')).toHaveTextContent(
      paymentResources.en.common.payments.delete.pendingAnnouncement,
    );
    expect(within(dialog).getByRole('button', { name: 'Keep payment' })).toBeDisabled();
    expect(within(dialog).getByRole('button', { name: 'Deleting payment…' })).toBeDisabled();
    await user.keyboard('{Escape}');
    expect(screen.getByRole('dialog', { name: 'Delete this payment permanently?' })).toBeInTheDocument();

    finishDelete?.();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('localizes the deletion dialog in Arabic RTL while keeping amounts isolated', async () => {
    const user = userEvent.setup();
    Object.defineProperty(window.navigator, 'languages', {
      configurable: true,
      value: ['ar'],
    });
    serveInitialPage(() => payment);

    renderCustomerRoutes([`/customers/${baseCustomer.id}`]);
    const history = await screen.findByRole('region', {
      name: customerDetailsResources.ar.common.customers.details.payments,
    });
    const row = await within(history).findByRole('listitem');
    await user.click(
      within(row).getByRole('button', {
        name: customerDetailsResources.ar.common.customers.details.paymentHistory.deletePayment,
      }),
    );

    const dialog = await screen.findByRole('dialog', {
      name: paymentResources.ar.common.payments.delete.title,
    });
    const isolatedAmount = dialog.querySelector('bdi');

    expect(document.documentElement).toHaveAttribute('lang', 'ar');
    expect(document.documentElement).toHaveAttribute('dir', 'rtl');
    expect(dialog).toHaveTextContent('القسط 2 من 4');
    expect(within(dialog).getByRole('button', {
      name: paymentResources.ar.common.payments.delete.keepPayment,
    })).toBeInTheDocument();
    expect(isolatedAmount).toHaveAttribute('dir', 'ltr');
    await user.click(within(dialog).getByRole('button', {
      name: paymentResources.ar.common.payments.delete.keepPayment,
    }));
  });

  it('localizes the payment deletion dialog in Turkish', async () => {
    const user = userEvent.setup();
    Object.defineProperty(window.navigator, 'languages', {
      configurable: true,
      value: ['tr'],
    });
    serveInitialPage(() => payment);

    renderCustomerRoutes([`/customers/${baseCustomer.id}`]);
    const history = await screen.findByRole('region', {
      name: customerDetailsResources.tr.common.customers.details.payments,
    });
    const row = await within(history).findByRole('listitem');
    await user.click(
      within(row).getByRole('button', {
        name: customerDetailsResources.tr.common.customers.details.paymentHistory.deletePayment,
      }),
    );

    const dialog = await screen.findByRole('dialog', {
      name: paymentResources.tr.common.payments.delete.title,
    });

    expect(dialog).toHaveTextContent('4 taksitten 2.');
    expect(dialog).toHaveTextContent('Kısmi ödendi');
    await user.click(within(dialog).getByRole('button', {
      name: paymentResources.tr.common.payments.delete.keepPayment,
    }));
  });
});

function serveInitialPage(
  getPayment: () => PaymentHistoryItem,
  onHistoryRead?: () => void,
) {
  server.use(
    http.get(`${getBackendUrl()}/customers/:customerId`, () =>
      HttpResponse.json(baseCustomer),
    ),
    http.get(`${getBackendUrl()}/customers/:customerId/debts`, () =>
      HttpResponse.json(emptyDebtList),
    ),
    http.get(`${getBackendUrl()}/customers/:customerId/payments`, () => {
      onHistoryRead?.();
      return HttpResponse.json({
        items: [getPayment()],
        pageSize: 10,
        totalItems: 1,
        nextCursor: null,
      } satisfies PaymentHistoryListResponse);
    }),
  );
}
