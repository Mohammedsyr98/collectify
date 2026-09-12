import '@testing-library/jest-dom/vitest';
import { cleanup, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { DebtListResponse, DebtResponse, SessionResponse } from '@collectify/contracts';

import App from '../../../App';
import { getBackendUrl } from '../../../shared/api/http';
import { renderWithAppProviders } from '../../../shared/test/render';
import { server } from '../../../shared/test/server';
import {
  baseCustomer,
  emptyCustomerList,
  emptyDebtList,
  resetCustomerTestEnvironment,
} from '../../customers/__tests__/customerTestData';

const ownerSession: SessionResponse = {
  authenticated: true,
  user: {
    id: 'user_123',
    email: 'owner@example.com',
    name: 'Owner',
  },
  ownerProfile: {
    preferredLanguage: 'en',
    defaultCurrency: 'USD',
  },
};

const createdDebt: DebtResponse = {
  id: 'debt_123',
  customerId: baseCustomer.id,
  description: 'Website redesign',
  totalAmount: '125.50',
  currency: 'USD',
  paymentPlanType: 'onePayment',
  scheduleItems: [
    {
      id: 'schedule_123',
      position: 1,
      amount: '125.50',
      dueDate: '2026-09-30',
      timing: 'upcoming',
    },
  ],
  createdAt: '2026-09-12T10:00:00.000Z',
  updatedAt: '2026-09-12T10:00:00.000Z',
};

describe('Customer debt workflow', () => {
  beforeEach(() => {
    resetCustomerTestEnvironment();
    server.use(
      http.get(`${getBackendUrl()}/customers`, () =>
        HttpResponse.json(emptyCustomerList),
      ),
    );
  });

  afterEach(() => {
    cleanup();
  });

  it('creates a debt from customer details and keeps the debt after a route remount', async () => {
    const user = userEvent.setup();
    let debtList: DebtListResponse = emptyDebtList;
    let customerDetails = baseCustomer;

    server.use(
      http.get(`${getBackendUrl()}/session`, () =>
        HttpResponse.json(ownerSession),
      ),
      http.get(`${getBackendUrl()}/customers/:customerId`, () =>
        HttpResponse.json(customerDetails),
      ),
      http.get(`${getBackendUrl()}/customers/:customerId/debts`, () =>
        HttpResponse.json(debtList),
      ),
      http.post(`${getBackendUrl()}/customers/:customerId/debts`, () => {
        debtList = {
          items: [createdDebt],
          page: 1,
          pageSize: 5,
          totalItems: 1,
          totalPages: 1,
        };
        customerDetails = {
          ...baseCustomer,
          financialSummary: [
            {
              currency: 'USD',
              totalDebtAmount: '125.50',
              totalPaidAmount: '0.00',
              remainingAmount: '125.50',
            },
          ],
        };
        return HttpResponse.json(createdDebt, { status: 201 });
      }),
    );

    const firstRender = renderWithAppProviders(<App />, {
      initialEntries: [`/customers/${baseCustomer.id}`],
    });

    expect(
      await screen.findByRole('heading', { name: baseCustomer.name }),
    ).toBeInTheDocument();

    const addDebtButton = screen.getByRole('button', { name: 'Add debt' });
    expect(addDebtButton).toBeEnabled();
    await user.click(addDebtButton);

    const drawer = await screen.findByRole('dialog', { name: 'Add debt' });
    await user.type(within(drawer).getByLabelText('Description'), 'Website redesign');
    await user.type(within(drawer).getByLabelText('Total amount'), '125.50');
    await user.selectOptions(within(drawer).getByLabelText('Currency'), 'USD');
    await user.type(within(drawer).getByLabelText('Due date'), '2026-09-30');
    await user.click(within(drawer).getByRole('button', { name: 'Save debt' }));

    expect(await screen.findByText('Website redesign')).toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'Debt created' })).toBeInTheDocument();

    firstRender.unmount();
    renderWithAppProviders(<App />, {
      initialEntries: [`/customers/${baseCustomer.id}`],
    });

    expect(await screen.findByText('Website redesign')).toBeInTheDocument();
  });
});
