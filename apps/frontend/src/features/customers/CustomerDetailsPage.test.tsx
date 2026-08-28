import '@testing-library/jest-dom/vitest';
import { cleanup, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { CustomerDetailsResponse } from '@collectify/contracts';

import { getBackendUrl } from '../../shared/api/http';
import { renderWithAppProviders } from '../../shared/test/render';
import { server } from '../../shared/test/server';
import { CustomerDetailsPage } from './CustomerDetailsPage';
import { CustomersPage } from './CustomersPage';

const baseCustomer: CustomerDetailsResponse = {
  id: 'customer_123',
  name: 'Acme Market',
  code: 'ACME-001',
  phoneNumber: '+90 555 123 45 67',
  address: 'Istanbul',
  createdAt: '2026-08-28T12:00:00.000Z',
  updatedAt: '2026-08-28T12:00:00.000Z',
  financialSummary: {
    totalDebtAmount: '0.00',
    totalPaidAmount: '0.00',
    balanceAmount: '0.00',
  },
};

function renderCustomerRoutes(initialEntries: string[]) {
  return renderWithAppProviders(
    <Routes>
      <Route element={<CustomersPage />} path="/customers" />
      <Route element={<CustomerDetailsPage />} path="/customers/:customerId" />
    </Routes>,
    { initialEntries },
  );
}

function setBrowserLanguages(languages: readonly string[]) {
  Object.defineProperty(window.navigator, 'languages', {
    configurable: true,
    value: languages,
  });
}

describe('CustomerDetailsPage', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.lang = '';
    document.documentElement.removeAttribute('dir');
    setBrowserLanguages(['en-US']);
  });

  afterEach(() => {
    cleanup();
  });

  it('fetches and renders durable customer details from the route id', async () => {
    let detailsRequestCount = 0;
    server.use(
      http.get(`${getBackendUrl()}/customers/:customerId`, ({ params }) => {
        detailsRequestCount += 1;

        if (params.customerId !== baseCustomer.id) {
          return HttpResponse.json(
            {
              code: 'CUSTOMER_NOT_FOUND',
              message: 'Customer was not found.',
            },
            { status: 404 },
          );
        }

        return HttpResponse.json(baseCustomer);
      }),
    );

    renderCustomerRoutes([`/customers/${baseCustomer.id}`]);

    expect(
      await screen.findByRole('heading', { name: 'Acme Market' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Code: ACME-001')).toBeInTheDocument();
    expect(screen.getByText('+90 555 123 45 67')).toBeInTheDocument();
    expect(screen.getByText('Istanbul')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Financial summary' })).toHaveTextContent(
      '0.00',
    );
    expect(screen.getByRole('region', { name: 'Debts' })).toHaveTextContent(
      'No debts yet.',
    );
    expect(screen.getByRole('region', { name: 'Payments' })).toHaveTextContent(
      'No payments yet.',
    );
    expect(screen.getByRole('button', { name: 'Add debt' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Record payment' })).toBeDisabled();
    await waitFor(() => expect(detailsRequestCount).toBe(1));
  });

  it('renders a customer-specific not-found state and routes back to customers', async () => {
    const user = userEvent.setup();
    server.use(
      http.get(`${getBackendUrl()}/customers/:customerId`, () =>
        HttpResponse.json(
          {
            code: 'CUSTOMER_NOT_FOUND',
            message: 'Customer was not found.',
          },
          { status: 404 },
        ),
      ),
    );

    renderCustomerRoutes(['/customers/missing']);

    expect(
      await screen.findByRole('heading', { name: 'Customer not found' }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Back to Customers' }));
    expect(
      await screen.findByRole('main', { name: 'Customers' }),
    ).toBeInTheDocument();
  });
});
