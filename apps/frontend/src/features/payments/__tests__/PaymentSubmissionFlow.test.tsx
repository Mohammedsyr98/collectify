import '@testing-library/jest-dom/vitest';
import { cleanup, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  paymentApiErrorCode,
  type DebtResponse,
  type RecordPaymentRequest,
  type RecordPaymentResponse,
} from '@collectify/contracts';

import { createAppI18nInstance } from '../../../app/localization/i18n';
import { getBackendUrl } from '../../../shared/api/http';
import { renderWithAppProviders } from '../../../shared/test/render';
import { server } from '../../../shared/test/server';
import { createDebtFixture } from '../../debts/__tests__/debtTestData';
import { PaymentDrawer } from '../editor/PaymentDrawer';
import { useRecordPaymentMutation } from '../paymentQueries';

describe('payment submission flow', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it('reuses the same idempotency key when an unchanged payment is retried after an uncertain response', async () => {
    const user = userEvent.setup();
    const requests: RecordPaymentRequest[] = [];
    const debt = createDebtFixture('customer_123');

    server.use(
      http.post(
        `${getBackendUrl()}/customers/:customerId/payments`,
        async ({ request }) => {
          const body = (await request.json()) as RecordPaymentRequest;
          requests.push(body);

          if (requests.length === 1) {
            return HttpResponse.error();
          }

          return HttpResponse.json(createPaymentResponse(body));
        },
      ),
    );

    renderWithAppProviders(<PaymentFlowHarness debt={debt} />);
    const drawer = screen.getByRole('dialog', { name: 'Record payment' });
    const amountInput = within(drawer).getByLabelText('Payment amount');
    await user.type(amountInput, '10.00');
    await user.click(within(drawer).getByRole('button', { name: 'Record payment' }));

    expect(
      await screen.findByRole('alert', { name: 'Payment could not be recorded' }),
    ).toBeInTheDocument();
    expect(amountInput).toHaveValue('10.00');

    await user.click(within(drawer).getByRole('button', { name: 'Record payment' }));

    await waitFor(() => expect(requests).toHaveLength(2));
    expect(requests[1]).toEqual(requests[0]);
    expect(screen.queryByRole('dialog', { name: 'Record payment' })).not.toBeInTheDocument();
    expect(
      await screen.findByRole('status', { name: 'Payment recorded' }),
    ).toBeInTheDocument();
  });

  it('uses a new idempotency key after the failed payment draft changes', async () => {
    const user = userEvent.setup();
    const requests: RecordPaymentRequest[] = [];
    const debt = createDebtFixture('customer_123');

    server.use(
      http.post(
        `${getBackendUrl()}/customers/:customerId/payments`,
        async ({ request }) => {
          const body = (await request.json()) as RecordPaymentRequest;
          requests.push(body);

          return requests.length === 1
            ? HttpResponse.error()
            : HttpResponse.json(createPaymentResponse(body));
        },
      ),
    );

    renderWithAppProviders(<PaymentFlowHarness debt={debt} />);
    const drawer = screen.getByRole('dialog', { name: 'Record payment' });
    const amountInput = within(drawer).getByLabelText('Payment amount');
    await user.type(amountInput, '10.00');
    await user.click(within(drawer).getByRole('button', { name: 'Record payment' }));

    await screen.findByRole('alert', { name: 'Payment could not be recorded' });
    await user.clear(amountInput);
    await user.type(amountInput, '11.00');
    await user.click(within(drawer).getByRole('button', { name: 'Record payment' }));

    await waitFor(() => expect(requests).toHaveLength(2));
    expect(requests[0].amount).toBe('10.00');
    expect(requests[1].amount).toBe('11.00');
    expect(requests[1].idempotencyKey).not.toBe(requests[0].idempotencyKey);
  });

  it('shows a version-conflict toast and preserves the payment draft', async () => {
    const user = userEvent.setup();
    const debt = createDebtFixture('customer_123');
    const backendMessage = 'Backend conflict wording.';
    const i18n = createAppI18nInstance('en');

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

    renderWithAppProviders(<PaymentFlowHarness debt={debt} />);
    const drawer = screen.getByRole('dialog', { name: 'Record payment' });
    const amountInput = within(drawer).getByLabelText('Payment amount');
    const noteInput = within(drawer).getByLabelText('Note (optional)');
    await user.type(amountInput, '10.00');
    await user.type(noteInput, 'cash');
    await user.click(within(drawer).getByRole('button', { name: 'Record payment' }));

    const errorToast = await screen.findByRole('alert', {
      name: i18n.t('payments.toast.record.errorTitle'),
    });
    expect(errorToast).toHaveTextContent(
      i18n.t(`payments.errors.${paymentApiErrorCode.paymentDebtVersionConflict}`),
    );
    expect(errorToast).not.toHaveTextContent(backendMessage);
    expect(drawer).toBeInTheDocument();
    expect(amountInput).toHaveValue('10.00');
    expect(noteInput).toHaveValue('cash');
  });
});

function PaymentFlowHarness({ debt }: { debt: DebtResponse }) {
  const [isOpen, setIsOpen] = useState(true);
  const { recordPayment } = useRecordPaymentMutation({
    customerId: debt.customerId,
    onRecorded: () => setIsOpen(false),
  });

  return isOpen ? (
    <PaymentDrawer
      debt={debt}
      onClose={() => setIsOpen(false)}
      onSubmit={recordPayment}
      targetScheduleItemId={debt.scheduleItems[0].id}
    />
  ) : null;
}

function createPaymentResponse(
  request: RecordPaymentRequest,
): RecordPaymentResponse {
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

