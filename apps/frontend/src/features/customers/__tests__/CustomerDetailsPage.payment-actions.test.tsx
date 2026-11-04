import '@testing-library/jest-dom/vitest';
import { cleanup, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type {
  CustomerDetailsResponse,
  DebtResponse,
  RecordPaymentRequest,
  RecordPaymentResponse,
} from '@collectify/contracts';

import { getBackendUrl } from '../../../shared/api/http';
import { server } from '../../../shared/test/server';
import {
  createDebtFixture,
  createInstallmentDebtFixture,
  emptyDebtList,
} from '../../debts/__tests__/debtTestData';
import { createPaymentTargetFixture } from '../../payments/__tests__/paymentTestData';
import {
  baseCustomer,
  emptyCustomerList,
  resetCustomerTestEnvironment,
} from './customerTestData';
import { renderCustomerRoutes } from './renderCustomerRoutes';

describe('CustomerDetailsPage payment actions', () => {
  beforeEach(() => {
    resetCustomerTestEnvironment();
    server.use(
      http.get(`${getBackendUrl()}/customers`, () =>
        HttpResponse.json(emptyCustomerList),
      ),
      http.get(`${getBackendUrl()}/customers/:customerId/debts`, () =>
        HttpResponse.json(emptyDebtList),
      ),
    );
  });

  afterEach(() => {
    cleanup();
  });

  it('opens the payment form from the header action through the target workflow', async () => {
    const user = userEvent.setup();
    const customer = {
      ...baseCustomer,
      financialSummary: [
        {
          currency: 'USD' as const,
          totalDebtAmount: '100.00',
          totalPaidAmount: '25.00',
          remainingAmount: '75.00',
        },
      ],
    };
    const target = createPaymentTargetFixture({
      debtDescription: 'Header target',
      remainingAmount: '75.00',
    });
    let targetRequestCount = 0;

    server.use(
      http.get(`${getBackendUrl()}/customers/:customerId`, () =>
        HttpResponse.json(customer),
      ),
      http.get(`${getBackendUrl()}/customers/:customerId/payment-targets`, () => {
        targetRequestCount += 1;

        return HttpResponse.json({
          items: [target],
          page: 1,
          pageSize: 10,
          totalItems: 1,
          totalPages: 1,
        });
      }),
    );

    renderCustomerRoutes([`/customers/${customer.id}`]);

    const headerPaymentButton = await screen.findByRole('button', {
      name: 'Record payment',
    });
    await user.click(headerPaymentButton);

    expect(
      await screen.findByRole('dialog', { name: 'Record payment' }),
    ).toBeInTheDocument();
    expect(targetRequestCount).toBe(1);
  });

  it('switches the header action to Add debt after the last eligible payment', async () => {
    const user = userEvent.setup();
    const initialCustomer = {
      ...baseCustomer,
      financialSummary: [
        {
          currency: 'USD' as const,
          totalDebtAmount: '10.00',
          totalPaidAmount: '0.00',
          remainingAmount: '10.00',
        },
      ],
    };
    const updatedCustomer = {
      ...initialCustomer,
      financialSummary: [
        {
          currency: 'USD' as const,
          totalDebtAmount: '10.00',
          totalPaidAmount: '10.00',
          remainingAmount: '0.00',
        },
      ],
    };
    const target = createPaymentTargetFixture({
      amount: '10.00',
      remainingAmount: '10.00',
    });
    let recordedRequest: RecordPaymentRequest | undefined;

    server.use(
      http.get(`${getBackendUrl()}/customers/:customerId`, () =>
        HttpResponse.json(recordedRequest ? updatedCustomer : initialCustomer),
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
      http.post(
        `${getBackendUrl()}/customers/:customerId/payments`,
        async ({ request }) => {
          recordedRequest = (await request.json()) as RecordPaymentRequest;
          return HttpResponse.json(createPaymentResponse(recordedRequest), { status: 201 });
        },
      ),
    );

    renderCustomerRoutes([`/customers/${initialCustomer.id}`]);

    const headerPaymentButton = await screen.findByRole('button', {
      name: 'Record payment',
    });
    await user.click(headerPaymentButton);

    const drawer = await screen.findByRole('dialog', { name: 'Record payment' });
    await user.type(within(drawer).getByLabelText('Payment amount'), '10');
    await user.click(within(drawer).getByRole('button', { name: 'Record payment' }));

    await waitFor(() =>
      expect(recordedRequest).toEqual(
        expect.objectContaining({ targetScheduleItemId: target.scheduleItemId }),
      ),
    );
    await waitFor(() =>
      expect(screen.getAllByRole('button', { name: 'Add debt' })[0]).toHaveFocus(),
    );
    expect(screen.queryByRole('button', { name: 'Record payment' })).not.toBeInTheDocument();
  });

  it('refreshes the selected installment, debt, and customer balances after recording a payment', async () => {
    const user = userEvent.setup();
    const initialDebt = createInstallmentDebtFixture(baseCustomer.id, {
      version: 7,
      scheduleItems: [
        {
          id: 'schedule_first',
          position: 1,
          amount: '60.00',
          dueDate: '2026-11-30',
          timing: 'upcoming',
        },
        {
          id: 'schedule_second',
          position: 2,
          amount: '40.00',
          dueDate: '2026-12-30',
          timing: 'upcoming',
        },
      ],
    });
    const updatedDebt = createInstallmentDebtFixture(baseCustomer.id, {
      ...initialDebt,
      paidAmount: '25.00',
      remainingAmount: '75.00',
      paymentState: 'partiallyPaid',
      paymentCount: 1,
      version: 8,
      scheduleItems: [
        {
          ...initialDebt.scheduleItems[0],
          paidAmount: '25.00',
          remainingAmount: '35.00',
          paymentState: 'partiallyPaid',
          paymentCount: 1,
        },
        initialDebt.scheduleItems[1],
      ],
    });
    const initialCustomer = {
      ...baseCustomer,
      financialSummary: [
        {
          currency: 'USD' as const,
          totalDebtAmount: '100.00',
          totalPaidAmount: '0.00',
          remainingAmount: '100.00',
        },
      ],
    };
    const updatedCustomer = {
      ...initialCustomer,
      financialSummary: [
        {
          currency: 'USD' as const,
          totalDebtAmount: '100.00',
          totalPaidAmount: '25.00',
          remainingAmount: '75.00',
        },
      ],
    };
    const paymentScenario = servePaymentScenario({
      initialCustomer,
      initialDebt,
      updatedCustomer,
      updatedDebt,
    });

    renderCustomerRoutes([`/customers/${baseCustomer.id}`]);

    const debtCard = await findDebtCard(initialDebt.description);
    await user.click(
      within(debtCard).getByRole('button', { name: 'View installments' }),
    );
    const schedule = within(debtCard).getByRole('region', {
      name: `Installment schedule for ${initialDebt.description}`,
    });
    const firstInstallmentRow = within(schedule).getAllByRole('listitem')[0]!;
    await user.click(
      within(firstInstallmentRow).getByRole('button', {
        name: 'Record payment',
      }),
    );

    const drawer = await screen.findByRole('dialog', { name: 'Record payment' });
    await user.type(within(drawer).getByLabelText('Payment amount'), '25');
    await user.click(
      within(drawer).getByRole('button', { name: 'Record payment' }),
    );

    await waitFor(() =>
      expect(paymentScenario.recordedRequest).toEqual(
        expect.objectContaining({
          targetScheduleItemId: 'schedule_first',
        }),
      ),
    );

    const refreshedDebtCard = await findDebtCard(updatedDebt.description);
    expect(
      within(refreshedDebtCard).getByRole('progressbar'),
    ).toHaveAttribute('aria-valuenow', '25');
    const refreshedSchedule = within(refreshedDebtCard).getByRole('region', {
      name: `Installment schedule for ${updatedDebt.description}`,
    });
    const refreshedInstallmentRow = within(refreshedSchedule).getAllByRole(
      'listitem',
    )[0]!;
    expect(refreshedInstallmentRow).toHaveTextContent('$25.00');
    expect(refreshedInstallmentRow).toHaveTextContent('$35.00');

    const summary = screen.getByRole('region', { name: 'Financial summary' });
    expect(summary).toHaveTextContent('$25.00');
    expect(summary).toHaveTextContent('$75.00');
  });

  it('records an installment payment against the selected schedule row', async () => {
    const user = userEvent.setup();
    const debt = createInstallmentDebtFixture(baseCustomer.id, {
      version: 4,
      scheduleItems: [
        {
          id: 'schedule_first',
          position: 1,
          amount: '60.00',
          dueDate: '2026-11-30',
          timing: 'upcoming',
        },
        {
          id: 'schedule_second',
          position: 2,
          amount: '40.00',
          dueDate: '2026-12-30',
          timing: 'upcoming',
        },
      ],
    });
    const paymentScenario = servePaymentScenario({ initialDebt: debt });

    renderCustomerRoutes([`/customers/${baseCustomer.id}`]);

    const debtCard = await findDebtCard(debt.description);
    await user.click(
      within(debtCard).getByRole('button', { name: 'View installments' }),
    );
    const schedule = within(debtCard).getByRole('region', {
      name: `Installment schedule for ${debt.description}`,
    });
    const rows = within(schedule).getAllByRole('listitem');

    await user.click(
      within(rows[1]!).getByRole('button', { name: 'Record payment' }),
    );

    const drawer = await screen.findByRole('dialog', { name: 'Record payment' });
    expect(within(drawer).getByText(/Installment 2/)).toBeInTheDocument();
    await user.type(within(drawer).getByLabelText('Payment amount'), '10');
    await user.click(
      within(drawer).getByRole('button', { name: 'Record payment' }),
    );

    await waitFor(() =>
      expect(paymentScenario.recordedRequest).toEqual(
        expect.objectContaining({
          targetScheduleItemId: 'schedule_second',
        }),
      ),
    );
  });

  it('returns focus to a payment action that becomes unavailable after full payment', async () => {
    const user = userEvent.setup();
    const initialDebt = createDebtFixture(baseCustomer.id, {
      totalAmount: '10.00',
      scheduleItems: [
        {
          id: 'schedule_full_payment',
          position: 1,
          amount: '10.00',
          dueDate: '2026-11-30',
          timing: 'upcoming',
        },
      ],
    });
    const paidDebt = createDebtFixture(baseCustomer.id, {
      ...initialDebt,
      paidAmount: '10.00',
      remainingAmount: '0.00',
      paymentState: 'paid',
      paymentCount: 1,
      version: 2,
      scheduleItems: [
        {
          ...initialDebt.scheduleItems[0],
          paidAmount: '10.00',
          remainingAmount: '0.00',
          paymentState: 'paid',
          paymentCount: 1,
        },
      ],
    });
    const paymentScenario = servePaymentScenario({
      initialDebt,
      updatedDebt: paidDebt,
    });

    renderCustomerRoutes([`/customers/${baseCustomer.id}`]);

    const debtCard = await findDebtCard(initialDebt.description);
    const paymentAction = within(debtCard).getByRole('button', {
      name: 'Record payment',
    });
    await user.click(paymentAction);

    const drawer = await screen.findByRole('dialog', { name: 'Record payment' });
    expect(within(drawer).getByText(/One payment/)).toBeInTheDocument();
    const paymentAmount = within(drawer).getByLabelText('Payment amount');
    expect(paymentAmount).toHaveFocus();
    await user.type(paymentAmount, '10');
    await user.click(
      within(drawer).getByRole('button', { name: 'Record payment' }),
    );

    await waitFor(() =>
      expect(paymentScenario.recordedRequest).toEqual(
        expect.objectContaining({
          targetScheduleItemId: 'schedule_full_payment',
        }),
      ),
    );
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Record payment' })).not.toBeInTheDocument(),
    );
    expect(paymentAction).toHaveAttribute('aria-disabled', 'true');
    expect(paymentAction).toHaveFocus();

    await user.click(paymentAction);
    expect(screen.queryByRole('dialog', { name: 'Record payment' })).not.toBeInTheDocument();
  });
});

async function findDebtCard(description: string): Promise<HTMLElement> {
  await screen.findByRole('heading', { name: description });
  const debtCard = screen
    .getByRole('heading', { name: description })
    .closest('article');

  if (!debtCard) {
    throw new Error('Expected the debt heading to belong to a debt card.');
  }

  return debtCard;
}

function servePaymentScenario({
  initialCustomer = baseCustomer,
  initialDebt,
  updatedCustomer = initialCustomer,
  updatedDebt = initialDebt,
}: {
  initialCustomer?: CustomerDetailsResponse;
  initialDebt: DebtResponse;
  updatedCustomer?: CustomerDetailsResponse;
  updatedDebt?: DebtResponse;
}) {
  let recordedRequest: RecordPaymentRequest | undefined;

  server.use(
    http.get(`${getBackendUrl()}/customers/:customerId`, () =>
      HttpResponse.json(recordedRequest ? updatedCustomer : initialCustomer),
    ),
    http.get(`${getBackendUrl()}/customers/:customerId/debts`, () =>
      HttpResponse.json({
        ...emptyDebtList,
        items: [recordedRequest ? updatedDebt : initialDebt],
        totalItems: 1,
        totalPages: 1,
      }),
    ),
    http.post(
      `${getBackendUrl()}/customers/:customerId/payments`,
      async ({ request }) => {
        recordedRequest = (await request.json()) as RecordPaymentRequest;
        return HttpResponse.json(createPaymentResponse(recordedRequest), {
          status: 201,
        });
      },
    ),
  );

  return {
    get recordedRequest() {
      return recordedRequest;
    },
  };
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
      createdAt: '2026-10-23T10:00:00.000Z',
      updatedAt: '2026-10-23T10:00:00.000Z',
    },
  };
}
