import '@testing-library/jest-dom/vitest';
import { cleanup, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { PaymentHistoryItem, PaymentHistoryListResponse } from '@collectify/contracts';

import { getBackendUrl } from '@/shared/api';
import { paymentResources } from '@/features/payments';
import { server } from '@/shared/test';
import { customerDetailsResources } from '../localization/resources';
import { baseCustomer, resetCustomerTestEnvironment } from './customerDetailsTestData';
import { emptyDebtList } from './debtTestData';
import { renderCustomerRoutes } from './renderCustomerRoutes';

const firstPayment: PaymentHistoryItem = {
  id: 'payment_not_selected',
  scheduleItemId: 'schedule_not_selected',
  debtId: 'debt_not_selected',
  debtDescription: 'Unselected debt',
  debtVersion: 2,
  amount: '10.00',
  maximumReplacementAmount: '90.00',
  deletionPreview: { remainingAmount: '90.00', targetPaymentState: 'unpaid' },
  currency: 'USD',
  paymentDate: '2026-10-19',
  note: null,
  plan: { type: 'onePayment' },
};

const selectedPayment: PaymentHistoryItem = {
  ...firstPayment,
  id: 'payment_selected',
  scheduleItemId: 'schedule_selected',
  debtId: 'debt_selected',
  debtDescription: 'Office equipment',
  debtVersion: 4,
  amount: '25.00',
  maximumReplacementAmount: '75.00',
  deletionPreview: { remainingAmount: '75.00', targetPaymentState: 'partiallyPaid' },
  paymentDate: '2026-10-20',
  plan: { type: 'installment', position: 2, total: 4 },
};

describe('CustomerDetailsPage payment deletion', () => {
  beforeEach(() => {
    resetCustomerTestEnvironment();
  });

  afterEach(() => cleanup());

  it('opens the deletion dialog for the payment whose history action was clicked', async () => {
    const user = userEvent.setup();
    server.use(
      http.get(`${getBackendUrl()}/customers/:customerId`, () =>
        HttpResponse.json(baseCustomer),
      ),
      http.get(`${getBackendUrl()}/customers/:customerId/debts`, () =>
        HttpResponse.json(emptyDebtList),
      ),
      http.get(`${getBackendUrl()}/customers/:customerId/payments`, () =>
        HttpResponse.json({
          items: [firstPayment, selectedPayment],
          pageSize: 10,
          totalItems: 2,
          nextCursor: null,
        } satisfies PaymentHistoryListResponse),
      ),
    );

    renderCustomerRoutes([`/customers/${baseCustomer.id}`]);

    const history = await screen.findByRole('region', {
      name: customerDetailsResources.en.common.customers.details.payments,
    });
    const rows = await within(history).findAllByRole('listitem');
    await user.click(
      within(rows[1]!).getByRole('button', {
        name: customerDetailsResources.en.common.customers.details.paymentHistory.deletePayment,
      }),
    );

    const dialog = await screen.findByRole('dialog', {
      name: paymentResources.en.common.payments.delete.title,
    });
    expect(dialog).toHaveTextContent('$25.00');
    expect(dialog).toHaveTextContent('Office equipment');
    expect(dialog).toHaveTextContent('Installment 2 of 4');
    expect(dialog).not.toHaveTextContent('Unselected debt');
    expect(dialog).not.toHaveTextContent('$10.00');
  });
});
