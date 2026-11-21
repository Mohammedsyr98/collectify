import '@testing-library/jest-dom/vitest';
import { cleanup, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { PaymentHistoryListResponse } from '@collectify/contracts';

import { getBackendUrl } from '@/shared/api';

import { baseCustomer, resetCustomerTestEnvironment } from './customerDetailsTestData';
import { emptyDebtList } from './debtTestData';
import { renderCustomerRoutes } from './renderCustomerRoutes';
import { server } from './render';

describe('CustomerPaymentHistory loading and recovery', () => {
  beforeEach(() => {
    resetCustomerTestEnvironment();
    server.use(
      http.get(`${getBackendUrl()}/customers/:customerId`, () =>
        HttpResponse.json(baseCustomer),
      ),
      http.get(`${getBackendUrl()}/customers/:customerId/debts`, () =>
        HttpResponse.json(emptyDebtList),
      ),
    );
  });

  afterEach(() => {
    cleanup();
  });

  it('recovers an initial failure through a section-local retry', async () => {
    const user = userEvent.setup();
    let requestCount = 0;

    server.use(
      http.get(`${getBackendUrl()}/customers/:customerId/payments`, () => {
        requestCount += 1;

        if (requestCount === 1) {
          return HttpResponse.text('Internal server error', { status: 500 });
        }

        return HttpResponse.json({
          items: [
            {
              id: 'recovered_payment',
              scheduleItemId: 'recovered_schedule',
              debtId: 'recovered_debt',
              debtDescription: 'Recovered payment debt',
              debtVersion: 2,
              amount: '30.00',
              currency: 'USD',
              paymentDate: '2026-10-20',
              note: null,
              plan: { type: 'onePayment' },
            },
          ],
          pageSize: 10,
          totalItems: 1,
          nextCursor: null,
        } satisfies PaymentHistoryListResponse);
      }),
    );

    renderCustomerRoutes([`/customers/${baseCustomer.id}`]);

    expect(await screen.findByRole('heading', { name: baseCustomer.name })).toBeInTheDocument();
    const payments = screen.getByRole('region', { name: 'Payments' });
    const error = await within(payments).findByRole('alert', {
      name: 'Could not load payments',
    });

    await user.click(within(error).getByRole('button', { name: 'Try again' }));

    expect(await within(payments).findByText('Recovered payment debt')).toBeInTheDocument();
    expect(within(payments).queryByRole('alert')).not.toBeInTheDocument();
    expect(requestCount).toBe(2);
  });

  it('announces a section-local loading state while the first page is pending', async () => {
    let resolveRequest!: () => void;
    const pendingRequest = new Promise<void>((resolve) => {
      resolveRequest = resolve;
    });
    server.use(
      http.get(`${getBackendUrl()}/customers/:customerId/payments`, async () => {
        await pendingRequest;
        return HttpResponse.json({
          items: [],
          pageSize: 10,
          totalItems: 0,
          nextCursor: null,
        } satisfies PaymentHistoryListResponse);
      }),
    );

    renderCustomerRoutes([`/customers/${baseCustomer.id}`]);

    try {
      expect(await screen.findByRole('heading', { name: baseCustomer.name })).toBeInTheDocument();
      const payments = screen.getByRole('region', { name: 'Payments' });
      expect(payments).toHaveAttribute('aria-busy', 'true');
      expect(within(payments).getByRole('status')).toHaveTextContent('Loading payments');
      expect(within(payments).getAllByTestId('payment-history-skeleton')).toHaveLength(3);
    } finally {
      resolveRequest();
    }
  });

  it('shows an empty state for an owned customer without payments', async () => {
    server.use(
      http.get(`${getBackendUrl()}/customers/:customerId/payments`, () =>
        HttpResponse.json({
          items: [],
          pageSize: 10,
          totalItems: 0,
          nextCursor: null,
        } satisfies PaymentHistoryListResponse),
      ),
    );

    renderCustomerRoutes([`/customers/${baseCustomer.id}`]);

    const payments = await screen.findByRole('region', { name: 'Payments' });
    expect(await within(payments).findByText('No payments yet.')).toBeInTheDocument();
    expect(within(payments).queryByRole('list')).not.toBeInTheDocument();
  });
});
