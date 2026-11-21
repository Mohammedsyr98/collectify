import '@testing-library/jest-dom/vitest';
import { cleanup, screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { PaymentHistoryListResponse } from '@collectify/contracts';

import { getBackendUrl } from '@/shared/api';

import { baseCustomer, resetCustomerTestEnvironment } from './customerDetailsTestData';
import { emptyDebtList } from './debtTestData';
import { renderCustomerRoutes } from './renderCustomerRoutes';
import { server } from './render';

describe('CustomerPaymentHistory', () => {
  beforeEach(() => {
    resetCustomerTestEnvironment();
    server.use(
      http.get(`${getBackendUrl()}/customers/:customerId`, () =>
        HttpResponse.json(baseCustomer),
      ),
      http.get(`${getBackendUrl()}/customers/:customerId/debts`, () =>
        HttpResponse.json(emptyDebtList),
      ),
      http.get(`${getBackendUrl()}/customers/:customerId/payments`, () =>
        HttpResponse.json({
          items: [
            {
              id: 'payment_history_1',
              scheduleItemId: 'schedule_history_1',
              debtId: 'debt_history_1',
              debtDescription: 'Office equipment',
              debtVersion: 4,
              amount: '25.00',
              currency: 'USD',
              paymentDate: '2026-10-20',
              note: 'Paid in cash',
              plan: { type: 'installment', position: 2, total: 4 },
            },
          ],
          pageSize: 10,
          totalItems: 1,
          nextCursor: null,
        } satisfies PaymentHistoryListResponse),
      ),
    );
  });

  afterEach(() => {
    cleanup();
  });

  it('shows received payment details in the customer Payments section', async () => {
    renderCustomerRoutes([`/customers/${baseCustomer.id}`]);

    const payments = await screen.findByRole('region', { name: 'Payments' });
    const row = await within(payments).findByRole('listitem');

    expect(row).toHaveTextContent('$25.00');
    expect(row).toHaveTextContent('October 20, 2026');
    expect(row).toHaveTextContent('Office equipment');
    expect(row).toHaveTextContent('Installment 2 of 4');
    expect(row).toHaveTextContent('Paid in cash');
    expect(payments).toHaveTextContent('Showing 1 of 1');
  });

  it('localizes installment context in Arabic RTL and isolates the monetary value', async () => {
    Object.defineProperty(window.navigator, 'languages', {
      configurable: true,
      value: ['ar'],
    });
    server.use(
      http.get(`${getBackendUrl()}/customers/:customerId/payments`, () =>
        HttpResponse.json({
          items: [
            {
              id: 'payment_history_ar',
              scheduleItemId: 'schedule_history_ar',
              debtId: 'debt_history_ar',
              debtDescription: 'معدات المكتب',
              debtVersion: 4,
              amount: '25.00',
              currency: 'USD',
              paymentDate: '2026-10-20',
              note: null,
              plan: { type: 'installment', position: 2, total: 4 },
            },
          ],
          pageSize: 10,
          totalItems: 1,
          nextCursor: null,
        } satisfies PaymentHistoryListResponse),
      ),
    );

    renderCustomerRoutes([`/customers/${baseCustomer.id}`]);

    const payments = await screen.findByRole('region', { name: 'الدفعات' });
    const row = await within(payments).findByRole('listitem');
    const isolatedAmount = row.querySelector('bdi');

    expect(document.documentElement).toHaveAttribute('lang', 'ar');
    expect(document.documentElement).toHaveAttribute('dir', 'rtl');
    expect(row).toHaveTextContent('القسط 2 من 4');
    expect(row).not.toHaveTextContent('Paid in cash');
    expect(isolatedAmount).toHaveAttribute('dir', 'ltr');
    expect(isolatedAmount).not.toBeEmptyDOMElement();
  });
});
