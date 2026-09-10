import '@testing-library/jest-dom/vitest';
import { cleanup, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { getBackendUrl } from '../../../shared/api/http';
import { localeStorageKey } from '../../../shared/localization';
import { renderWithAppProviders } from '../../../shared/test/render';
import { server } from '../../../shared/test/server';
import { CustomerDetailsPage } from '../CustomerDetailsPage';
import { CustomersPage } from '../CustomersPage';
import {
  baseCustomer,
  emptyCustomerList,
  resetCustomerTestEnvironment,
} from './customerTestData';

const customerWithAddress = {
  ...baseCustomer,
  address: 'Istanbul',
};

const customerWithFinancialActivity = {
  ...baseCustomer,
  id: 'customer_financial_details',
  name: 'South Ledger',
  code: 'SL-003',
  financialSummary: [
    {
      currency: 'EUR',
      totalDebtAmount: '180.25',
      totalPaidAmount: '40.50',
      remainingAmount: '139.75',
    },
    {
      currency: 'USD',
      totalDebtAmount: '75.00',
      totalPaidAmount: '75.00',
      remainingAmount: '0.00',
    },
  ],
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

describe('CustomerDetailsPage', () => {
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

  it('fetches and renders durable customer details from the route id', async () => {
    let detailsRequestCount = 0;
    server.use(
      http.get(`${getBackendUrl()}/customers/:customerId`, ({ params }) => {
        detailsRequestCount += 1;

        if (params.customerId !== customerWithAddress.id) {
          return HttpResponse.json(
            {
              code: 'CUSTOMER_NOT_FOUND',
              message: 'Customer was not found.',
            },
            { status: 404 },
          );
        }

        return HttpResponse.json(customerWithAddress);
      }),
    );

    renderCustomerRoutes([`/customers/${customerWithAddress.id}`]);

    expect(
      await screen.findByRole('heading', { name: 'Acme Market' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Code: ACME-001')).toBeInTheDocument();
    expect(screen.getByText('+90 555 123 45 67')).toBeInTheDocument();
    expect(screen.getByText('Istanbul')).toBeInTheDocument();
    expect(
      screen.getByRole('region', { name: 'Financial summary' }),
    ).toHaveTextContent('No financial activity');
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

  it('opens a prefilled edit form from loaded details', async () => {
    const user = userEvent.setup();
    let detailsRequestCount = 0;

    server.use(
      http.get(`${getBackendUrl()}/customers/:customerId`, ({ params }) => {
        detailsRequestCount += 1;

        if (params.customerId !== customerWithAddress.id) {
          return HttpResponse.json(
            {
              code: 'CUSTOMER_NOT_FOUND',
              message: 'Customer was not found.',
            },
            { status: 404 },
          );
        }

        return HttpResponse.json(customerWithAddress);
      }),
    );

    renderCustomerRoutes([`/customers/${customerWithAddress.id}`]);

    expect(
      await screen.findByRole('heading', { name: 'Acme Market' }),
    ).toBeInTheDocument();
    expect(detailsRequestCount).toBe(1);

    await user.click(screen.getByRole('button', { name: 'Edit customer' }));

    expect(detailsRequestCount).toBe(1);
    expect(screen.getByRole('heading', { name: 'Edit customer' })).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toHaveValue('Acme Market');
    expect(screen.getByLabelText('Code')).toHaveValue('ACME-001');
    expect(screen.getByLabelText('Phone number')).toHaveValue('+90 555 123 45 67');
    expect(screen.getByLabelText('Address')).toHaveValue('Istanbul');
  });

  it('renders populated financial summary values without combining currencies', async () => {
    server.use(
      http.get(`${getBackendUrl()}/customers/:customerId`, () =>
        HttpResponse.json(customerWithFinancialActivity),
      ),
    );

    renderCustomerRoutes([
      `/customers/${customerWithFinancialActivity.id}`,
    ]);

    const summary = await screen.findByRole('region', {
      name: 'Financial summary',
    });

    expect(summary).toHaveTextContent('EUR');
    expect(summary).toHaveTextContent('180.25');
    expect(summary).toHaveTextContent('40.50');
    expect(summary).toHaveTextContent('139.75');
  });

  it('shows all currency summaries by default and filters to one currency', async () => {
    const user = userEvent.setup();
    server.use(
      http.get(`${getBackendUrl()}/customers/:customerId`, () =>
        HttpResponse.json(customerWithFinancialActivity),
      ),
    );

    renderCustomerRoutes([
      `/customers/${customerWithFinancialActivity.id}`,
    ]);

    const summary = await screen.findByRole('region', {
      name: 'Financial summary',
    });
    const allCurrencies = screen.getByRole('button', { name: 'All currencies' });
    const usd = screen.getByRole('button', { name: 'USD' });

    expect(allCurrencies).toHaveAttribute('aria-pressed', 'true');
    expect(
      within(summary)
        .getAllByRole('progressbar')
        .map((progressbar) => progressbar.getAttribute('aria-label')),
    ).toEqual(['Payment progress for EUR', 'Payment progress for USD']);

    await user.click(usd);

    expect(usd).toHaveAttribute('aria-pressed', 'true');
    expect(
      within(summary)
        .getAllByRole('progressbar')
        .map((progressbar) => progressbar.getAttribute('aria-label')),
    ).toEqual(['Payment progress for USD']);
    expect(summary).toHaveTextContent('75.00');
  });

  it('isolates localized currency amounts for Arabic reading order', async () => {
    window.localStorage.setItem(localeStorageKey, 'ar');
    server.use(
      http.get(`${getBackendUrl()}/customers/:customerId`, () =>
        HttpResponse.json(customerWithFinancialActivity),
      ),
    );

    renderCustomerRoutes([
      `/customers/${customerWithFinancialActivity.id}`,
    ]);

    const summary = await screen.findByRole('region', {
      name: 'الملخص المالي',
    });
    const amount = Array.from(summary.querySelectorAll('[dir="ltr"]')).find(
      (element) => element.textContent?.includes('€'),
    );

    if (!amount) {
      throw new Error('Expected an isolated EUR amount in the financial summary.');
    }

    expect(amount.tagName).toBe('BDI');
    expect(amount).toHaveAttribute('dir', 'ltr');
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
