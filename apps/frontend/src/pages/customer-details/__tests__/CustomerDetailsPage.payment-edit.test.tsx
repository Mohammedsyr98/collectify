import '@testing-library/jest-dom/vitest';
import { cleanup, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  paymentApiErrorCode,
  paymentHistoryPageSize,
  type PaymentHistoryItem,
  type ReplacePaymentResponse,
} from '@collectify/contracts';

import { getBackendUrl } from '@/shared/api';

import { paymentResources } from '@/features/payments';
import { baseCustomer, resetCustomerTestEnvironment } from './customerDetailsTestData';
import { renderCustomerRoutes } from './renderCustomerRoutes';
import { server } from './render';

const messages = paymentResources.en.common.payments;

const payment: PaymentHistoryItem = {
  id: 'payment_history_edit',
  scheduleItemId: 'schedule_history_edit',
  debtId: 'debt_history_edit',
  debtDescription: 'Office equipment',
  debtVersion: 4,
  amount: '25.00',
  maximumReplacementAmount: '70.00',
  currency: 'USD',
  paymentDate: '2026-10-20',
  note: 'Original note',
  plan: { type: 'onePayment' },
};

describe('CustomerDetailsPage payment editing', () => {
  beforeEach(() => {
    resetCustomerTestEnvironment();
    server.use(
      http.get(`${getBackendUrl()}/customers/:customerId`, () =>
        HttpResponse.json(baseCustomer),
      ),
      http.get(`${getBackendUrl()}/customers/:customerId/debts`, () =>
        HttpResponse.json({
          items: [],
          page: 1,
          pageSize: 5,
          totalItems: 0,
          totalPages: 0,
        }),
      ),
      http.get(`${getBackendUrl()}/customers/:customerId/payment-targets`, () =>
        HttpResponse.json({
          items: [],
          page: 1,
          pageSize: 10,
          totalItems: 0,
          totalPages: 0,
        }),
      ),
    );
  });

  afterEach(() => cleanup());

  it('shows the corrected payment after submitting only editable fields', async () => {
    const user = userEvent.setup();
    let receivedBody: unknown;
    let replacementSaved = false;
    const correctedPayment: PaymentHistoryItem = {
      ...payment,
      amount: '35.00',
      debtVersion: 5,
    };
    const response: ReplacePaymentResponse = {
      payment: {
        id: payment.id,
        scheduleItemId: payment.scheduleItemId,
        amount: '35.00',
        paymentDate: payment.paymentDate,
        note: payment.note,
        idempotencyKey: '10000000-0000-4000-8000-000000000001',
        createdAt: '2026-10-20T07:00:00.000Z',
        updatedAt: '2026-10-21T07:00:00.000Z',
      },
    };

    server.use(
      http.get(`${getBackendUrl()}/customers/:customerId/payments`, () => {
        return HttpResponse.json({
          items: [replacementSaved ? correctedPayment : payment],
          pageSize: paymentHistoryPageSize,
          totalItems: 1,
          nextCursor: null,
        });
      }),
      http.put(
        `${getBackendUrl()}/customers/:customerId/payments/:paymentId`,
        async ({ request }) => {
          receivedBody = await request.json();
          replacementSaved = true;
          return HttpResponse.json(response);
        },
      ),
    );

    renderCustomerRoutes([`/customers/${baseCustomer.id}`]);
    const editButton = await screen.findByRole('button', {
      name: 'Edit payment',
    });
    await user.click(editButton);

    const drawer = await screen.findByRole('dialog', { name: messages.drawer.editTitle });
    const amountInput = within(drawer).getByLabelText(messages.drawer.correctedAmountLabel);
    await user.clear(amountInput);
    await user.type(amountInput, '35.00');
    await user.click(within(drawer).getByRole('button', { name: messages.drawer.saveCorrection }));

    await waitFor(() => expect(receivedBody).toEqual({
      amount: '35.00',
      paymentDate: '2026-10-20',
      note: 'Original note',
      expectedSourceDebtVersion: 4,
    }));
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: messages.drawer.editTitle })).not.toBeInTheDocument(),
    );
    expect(await screen.findByText('$35.00')).toBeInTheDocument();
  });

  it('keeps the draft and does not refetch or expose a recovery control on conflict', async () => {
    const user = userEvent.setup();
    let historyRequests = 0;

    server.use(
      http.get(`${getBackendUrl()}/customers/:customerId/payments`, () => {
        historyRequests += 1;
        return HttpResponse.json({
          items: [payment],
          pageSize: paymentHistoryPageSize,
          totalItems: 1,
          nextCursor: null,
        });
      }),
      http.put(
        `${getBackendUrl()}/customers/:customerId/payments/:paymentId`,
        () =>
          HttpResponse.json(
            {
              code: paymentApiErrorCode.paymentDebtVersionConflict,
              message: 'Debt changed.',
            },
            { status: 409 },
          ),
      ),
    );

    renderCustomerRoutes([`/customers/${baseCustomer.id}`]);
    await user.click(await screen.findByRole('button', { name: 'Edit payment' }));
    const drawer = await screen.findByRole('dialog', { name: messages.drawer.editTitle });
    const amountInput = within(drawer).getByLabelText(messages.drawer.correctedAmountLabel);
    await user.clear(amountInput);
    await user.type(amountInput, '36.00');
    const requestsBeforeSave = historyRequests;

    await user.click(within(drawer).getByRole('button', { name: messages.drawer.saveCorrection }));

    const alert = await within(drawer).findByRole('alert');
    expect(alert).toHaveTextContent(messages.drawer.versionConflict);
    expect(amountInput).toHaveValue('36.00');
    expect(within(drawer).getByRole('button', { name: messages.drawer.saveCorrection })).toBeEnabled();
    expect(within(drawer).queryByRole('button', { name: /refresh|retry/i })).not.toBeInTheDocument();
    expect(historyRequests).toBe(requestsBeforeSave);
  });
});
