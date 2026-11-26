import '@testing-library/jest-dom/vitest';
import { cleanup, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { useRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  DeletePaymentRequest,
  DeletePaymentResponse,
  PaymentHistoryItem,
} from '@collectify/contracts';

import { getBackendUrl } from '@/shared/api';
import { server } from '@/shared/test';

import { paymentResources } from '../localization/resources';
import { paymentTargetListQueryKey } from '../model/paymentTargetQueries';
import { usePaymentDeleter } from '../ui/usePaymentDeleter';
import { renderWithAppProviders } from './render';

const customerId = 'customer_payment_deletion';

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

const refreshedPayment = {
  ...payment,
  debtVersion: 5,
  maximumReplacementAmount: '65.00',
} satisfies PaymentHistoryItem;

const deleteResponse: DeletePaymentResponse = {
  deletedPaymentId: payment.id,
  debt: {
    id: payment.debtId,
    customerId,
    description: payment.debtDescription,
    totalAmount: '400.00',
    paidAmount: '25.00',
    remainingAmount: '375.00',
    paymentState: 'partiallyPaid',
    paymentCount: 1,
    currency: 'USD',
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-20T00:00:00.000Z',
    version: 5,
    paymentPlanType: 'installment',
    scheduleItems: [
      {
        id: 'schedule_1',
        position: 1,
        amount: '100.00',
        paidAmount: '0.00',
        remainingAmount: '100.00',
        paymentState: 'unpaid',
        paymentCount: 0,
        dueDate: '2026-10-10',
        timing: 'upcoming',
      },
      {
        id: payment.scheduleItemId,
        position: 2,
        amount: '100.00',
        paidAmount: '25.00',
        remainingAmount: '75.00',
        paymentState: 'partiallyPaid',
        paymentCount: 1,
        dueDate: '2026-10-20',
        timing: 'overdue',
      },
      {
        id: 'schedule_3',
        position: 3,
        amount: '100.00',
        paidAmount: '0.00',
        remainingAmount: '100.00',
        paymentState: 'unpaid',
        paymentCount: 0,
        dueDate: '2026-10-30',
        timing: 'upcoming',
      },
      {
        id: 'schedule_4',
        position: 4,
        amount: '100.00',
        paidAmount: '0.00',
        remainingAmount: '100.00',
        paymentState: 'unpaid',
        paymentCount: 0,
        dueDate: '2026-11-10',
        timing: 'upcoming',
      },
    ],
  },
  customerFinancialSummary: [
    {
      currency: 'USD',
      totalDebtAmount: '400.00',
      totalPaidAmount: '25.00',
      remainingAmount: '375.00',
    },
  ],
};

describe('payment deletion flow', () => {
  beforeEach(resetTestEnvironment);

  afterEach(() => {
    cleanup();
    server.resetHandlers();
  });

  it('previews the selected payment, sends its version, refreshes affected data, and focuses history on success', async () => {
    const user = userEvent.setup();
    let receivedRequest: DeletePaymentRequest | undefined;
    server.use(
      http.delete(
        `${getBackendUrl()}/customers/:customerId/payments/:paymentId`,
        async ({ request }) => {
          receivedRequest = (await request.json()) as DeletePaymentRequest;
          return HttpResponse.json(deleteResponse);
        },
      ),
    );

    const { queryClient } = renderWithAppProviders(
      <PaymentDeletionHarness payment={payment} />,
    );
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');
    const trigger = screen.getByRole('button', { name: 'Delete payment' });
    await user.click(trigger);

    const dialog = await screen.findByRole('dialog', {
      name: paymentResources.en.common.payments.delete.title,
    });
    expect(dialog).toHaveTextContent('$25.00');
    expect(dialog).toHaveTextContent('October 20, 2026');
    expect(dialog).toHaveTextContent('Office equipment');
    expect(dialog).toHaveTextContent('Installment 2 of 4');
    expect(dialog).toHaveTextContent('$75.00');
    expect(dialog).toHaveTextContent('Partially paid');
    expect(within(dialog).getByRole('button', { name: 'Keep payment' })).toHaveFocus();

    await user.click(within(dialog).getByRole('button', { name: 'Keep payment' }));
    expect(trigger).toHaveFocus();
    await user.click(trigger);
    const reopenedDialog = await screen.findByRole('dialog', {
      name: paymentResources.en.common.payments.delete.title,
    });
    await user.click(within(reopenedDialog).getByRole('button', { name: 'Delete payment' }));

    await waitFor(() => expect(receivedRequest).toEqual({ expectedDebtVersion: 4 }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['customers', customerId],
      exact: true,
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['customers', customerId, 'payments', 'history'],
      exact: true,
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['customers', customerId, 'debts'],
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: paymentTargetListQueryKey(customerId),
    });
    expect(screen.getByRole('heading', { name: 'Payment History' })).toHaveFocus();
    expect(
      await screen.findByRole('status', { name: 'Payment deleted' }),
    ).toHaveTextContent('Installment 2 of 4 remaining: $75.00. Status: Partially paid.');
  });

  it('keeps a stale preview open and blocks retry until the dialog is reopened', async () => {
    const user = userEvent.setup();
    let requestCount = 0;
    server.use(
      http.delete(
        `${getBackendUrl()}/customers/:customerId/payments/:paymentId`,
        () => {
          requestCount += 1;
          return HttpResponse.json(
            { code: 'PAYMENT_DEBT_VERSION_CONFLICT', message: 'The debt changed.' },
            { status: 409 },
          );
        },
      ),
    );

    const { rerender } = renderWithAppProviders(
      <PaymentDeletionHarness payment={payment} />,
    );
    const trigger = screen.getByRole('button', { name: 'Delete payment' });
    await user.click(trigger);
    let dialog = await screen.findByRole('dialog', {
      name: paymentResources.en.common.payments.delete.title,
    });
    await user.click(within(dialog).getByRole('button', { name: 'Delete payment' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      paymentResources.en.common.payments.delete.failure.stale,
    );
    const deleteButton = within(dialog).getByRole('button', { name: 'Delete payment' });
    expect(deleteButton).toBeDisabled();
    await user.click(within(dialog).getByRole('button', { name: 'Keep payment' }));
    expect(trigger).toHaveFocus();

    rerender(<PaymentDeletionHarness payment={refreshedPayment} />);
    await user.click(trigger);
    dialog = await screen.findByRole('dialog', {
      name: paymentResources.en.common.payments.delete.title,
    });
    expect(dialog).toHaveTextContent('$65.00');
    expect(within(dialog).getByRole('button', { name: 'Delete payment' })).toBeEnabled();
    expect(requestCount).toBe(1);
    await user.click(within(dialog).getByRole('button', { name: 'Keep payment' }));
  });

  it('disables both actions and prevents Escape dismissal while deletion is pending', async () => {
    const user = userEvent.setup();
    let finishDelete: (() => void) | undefined;
    const waitForDelete = new Promise<void>((resolve) => {
      finishDelete = resolve;
    });
    server.use(
      http.delete(
        `${getBackendUrl()}/customers/:customerId/payments/:paymentId`,
        async () => {
          await waitForDelete;
          return HttpResponse.json(deleteResponse);
        },
      ),
    );

    renderWithAppProviders(<PaymentDeletionHarness payment={payment} />);
    await user.click(screen.getByRole('button', { name: 'Delete payment' }));
    const dialog = await screen.findByRole('dialog', {
      name: paymentResources.en.common.payments.delete.title,
    });
    await user.click(within(dialog).getByRole('button', { name: 'Delete payment' }));

    expect(await within(dialog).findByRole('status')).toHaveTextContent(
      paymentResources.en.common.payments.delete.pendingAnnouncement,
    );
    expect(within(dialog).getByRole('button', { name: 'Keep payment' })).toBeDisabled();
    expect(
      within(dialog).getByRole('button', {
        name: paymentResources.en.common.payments.delete.deleting,
      }),
    ).toBeDisabled();
    await user.keyboard('{Escape}');
    expect(screen.getByRole('dialog', {
      name: paymentResources.en.common.payments.delete.title,
    })).toBeInTheDocument();

    finishDelete?.();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('renders in Arabic RTL and isolates currency direction', async () => {
    const user = userEvent.setup();
    setLocale('ar');

    renderWithAppProviders(<PaymentDeletionHarness payment={payment} />);
    await user.click(screen.getByRole('button', { name: 'Delete payment' }));
    const dialog = await screen.findByRole('dialog', {
      name: paymentResources.ar.common.payments.delete.title,
    });

    expect(document.documentElement).toHaveAttribute('lang', 'ar');
    expect(document.documentElement).toHaveAttribute('dir', 'rtl');
    expect(dialog).toHaveTextContent('القسط 2 من 4');
    expect(within(dialog).getByRole('button', {
      name: paymentResources.ar.common.payments.delete.keepPayment,
    })).toBeInTheDocument();
    expect(dialog.querySelector('bdi')).toHaveAttribute('dir', 'ltr');
    await user.click(within(dialog).getByRole('button', {
      name: paymentResources.ar.common.payments.delete.keepPayment,
    }));
  });

  it('renders the deletion dialog in Turkish', async () => {
    const user = userEvent.setup();
    setLocale('tr');

    renderWithAppProviders(<PaymentDeletionHarness payment={payment} />);
    await user.click(screen.getByRole('button', { name: 'Delete payment' }));
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

function PaymentDeletionHarness({ payment: selectedPayment }: { payment: PaymentHistoryItem }) {
  const { dialog, open } = usePaymentDeleter({ customerId });
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const headingRef = useRef<HTMLHeadingElement | null>(null);

  return (
    <>
      <button
        onClick={() =>
          open(selectedPayment, {
            returnFocusTarget: triggerRef.current,
            afterDelete: headingRef.current,
          })
        }
        ref={triggerRef}
        type="button"
      >
        Delete payment
      </button>
      <h2 ref={headingRef} tabIndex={-1}>
        Payment History
      </h2>
      {dialog}
    </>
  );
}

function resetTestEnvironment() {
  window.localStorage.clear();
  document.documentElement.lang = '';
  document.documentElement.removeAttribute('dir');
  setLocale('en-US');
}

function setLocale(locale: string) {
  Object.defineProperty(window.navigator, 'languages', {
    configurable: true,
    value: [locale],
  });
}
