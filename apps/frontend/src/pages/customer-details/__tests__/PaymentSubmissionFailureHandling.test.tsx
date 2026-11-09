import '@testing-library/jest-dom/vitest';
import { cleanup, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  paymentApiErrorCode,
  type CustomerDetailsResponse,
  type PaymentTarget,
  type RecordPaymentRequest,
  type RecordPaymentResponse,
} from '@collectify/contracts';

import { getBackendUrl } from '@/shared/api';
import { renderWithAppProviders, server } from '@/shared/test';
import { CustomerDetailsPage } from '../CustomerDetailsPage';
import { paymentResources } from '@/features/payments';
import { createPaymentTargetFixture } from './paymentTestData';

const paymentMessages = paymentResources.en.common.payments;

describe('payment submission failure handling', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it('reuses the same idempotency key when an unchanged payment is retried after an uncertain response', async () => {
    const user = userEvent.setup();
    const requests: RecordPaymentRequest[] = [];
    const target = createPaymentTargetFixture();

    server.use(
      http.post(`${getBackendUrl()}/customers/:customerId/payments`, async ({ request }) => {
        const body = (await request.json()) as RecordPaymentRequest;
        requests.push(body);

        if (requests.length === 1) {
          return HttpResponse.error();
        }

        return HttpResponse.json(createPaymentResponse(body));
      }),
    );

    renderPaymentSubmissionFailure(target);
    await user.click(await screen.findByRole('button', { name: paymentMessages.drawer.submit }));

    const drawer = await screen.findByRole('dialog', { name: paymentMessages.drawer.title });
    const amountInput = await within(drawer).findByLabelText(paymentMessages.drawer.amountLabel);
    await user.type(amountInput, '10.00');
    await user.click(within(drawer).getByRole('button', { name: paymentMessages.drawer.submit }));

    expect(
      await screen.findByRole('alert', { name: paymentMessages.toast.record.errorTitle }),
    ).toBeInTheDocument();
    expect(amountInput).toHaveValue('10.00');

    await user.click(within(drawer).getByRole('button', { name: paymentMessages.drawer.submit }));

    await waitFor(() => expect(requests).toHaveLength(2));
    expect(requests[1]).toEqual(requests[0]);
    expect(
      screen.queryByRole('dialog', { name: paymentMessages.drawer.title }),
    ).not.toBeInTheDocument();
    expect(
      await screen.findByRole('status', { name: paymentMessages.toast.record.successTitle }),
    ).toBeInTheDocument();
  });

  it('uses a new idempotency key after the failed payment draft changes', async () => {
    const user = userEvent.setup();
    const requests: RecordPaymentRequest[] = [];
    const target = createPaymentTargetFixture();

    server.use(
      http.post(`${getBackendUrl()}/customers/:customerId/payments`, async ({ request }) => {
        const body = (await request.json()) as RecordPaymentRequest;
        requests.push(body);

        return requests.length === 1
          ? HttpResponse.error()
          : HttpResponse.json(createPaymentResponse(body));
      }),
    );

    renderPaymentSubmissionFailure(target);
    await user.click(await screen.findByRole('button', { name: paymentMessages.drawer.submit }));

    const drawer = await screen.findByRole('dialog', { name: paymentMessages.drawer.title });
    const amountInput = await within(drawer).findByLabelText(paymentMessages.drawer.amountLabel);
    await user.type(amountInput, '10.00');
    await user.click(within(drawer).getByRole('button', { name: paymentMessages.drawer.submit }));

    await screen.findByRole('alert', { name: paymentMessages.toast.record.errorTitle });
    await user.clear(amountInput);
    await user.type(amountInput, '11.00');
    await user.click(within(drawer).getByRole('button', { name: paymentMessages.drawer.submit }));

    await waitFor(() => expect(requests).toHaveLength(2));
    expect(requests[0].amount).toBe('10.00');
    expect(requests[1].amount).toBe('11.00');
    expect(requests[1].idempotencyKey).not.toBe(requests[0].idempotencyKey);
  });

  it('shows a version-conflict toast and preserves the payment draft', async () => {
    const user = userEvent.setup();
    const target = createPaymentTargetFixture();
    const backendMessage = 'Backend conflict wording.';

    server.use(
      http.post(`${getBackendUrl()}/customers/:customerId/payments`, () =>
        HttpResponse.json(
          {
            code: paymentApiErrorCode.paymentDebtVersionConflict,
            message: backendMessage,
          },
          { status: 409 },
        ),
      ),
    );

    renderPaymentSubmissionFailure(target);
    await user.click(await screen.findByRole('button', { name: paymentMessages.drawer.submit }));

    const drawer = await screen.findByRole('dialog', { name: paymentMessages.drawer.title });
    const amountInput = await within(drawer).findByLabelText(paymentMessages.drawer.amountLabel);
    const noteInput = within(drawer).getByLabelText(paymentMessages.drawer.noteLabel);
    await user.type(amountInput, '10.00');
    await user.type(noteInput, 'cash');
    await user.click(within(drawer).getByRole('button', { name: paymentMessages.drawer.submit }));

    const errorToast = await screen.findByRole('alert', {
      name: paymentMessages.toast.record.errorTitle,
    });
    expect(errorToast).toHaveTextContent(
      paymentMessages.errors[paymentApiErrorCode.paymentDebtVersionConflict],
    );
    expect(errorToast).not.toHaveTextContent(backendMessage);
    expect(drawer).toBeInTheDocument();
    expect(amountInput).toHaveValue('10.00');
    expect(noteInput).toHaveValue('cash');
  });
});

function renderPaymentSubmissionFailure(target: PaymentTarget) {
  const customer = {
    id: 'customer_123',
    name: 'Acme Market',
    code: 'ACME-001',
    phoneNumber: '+90 555 123 45 67',
    address: null,
    createdAt: '2026-08-28T12:00:00.000Z',
    updatedAt: '2026-08-28T12:00:00.000Z',
    financialSummary: [
      {
        currency: target.currency,
        totalDebtAmount: target.remainingAmount,
        totalPaidAmount: '0.00',
        remainingAmount: target.remainingAmount,
      },
    ],
  } satisfies CustomerDetailsResponse;

  server.use(
    http.get(`${getBackendUrl()}/customers/:customerId`, () => HttpResponse.json(customer)),
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
        items: [target],
        page: 1,
        pageSize: 10,
        totalItems: 1,
        totalPages: 1,
      }),
    ),
  );

  return renderWithAppProviders(
    <Routes>
      <Route
        element={<CustomerDetailsPage defaultCurrency="USD" />}
        path="/customers/:customerId"
      />
    </Routes>,
    { initialEntries: [`/customers/${customer.id}`] },
  );
}

function createPaymentResponse(request: RecordPaymentRequest): RecordPaymentResponse {
  return {
    payment: {
      id: 'payment_123',
      scheduleItemId: request.targetScheduleItemId,
      amount: request.amount,
      paymentDate: request.paymentDate,
      note: request.note,
      idempotencyKey: request.idempotencyKey,
      createdAt: '2026-10-22T10:00:00.000Z',
      updatedAt: '2026-10-22T10:00:00.000Z',
    },
  };
}
