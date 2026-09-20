import '@testing-library/jest-dom/vitest';
import { cleanup, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { Currency } from '@collectify/contracts';

import { getBackendUrl } from '../../../shared/api/http';
import { localeStorageKey } from '../../../shared/localization';
import { renderWithAppProviders } from '../../../shared/test/render';
import { server } from '../../../shared/test/server';
import {
  createDebtFixture,
  emptyDebtList,
} from '../../debts/__tests__/debtTestData';
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

function renderCustomerRoutes(
  initialEntries: string[],
  { defaultCurrency }: { defaultCurrency?: Currency } = {},
) {
  return renderWithAppProviders(
    <Routes>
      <Route element={<CustomersPage />} path="/customers" />
      <Route
        element={<CustomerDetailsPage defaultCurrency={defaultCurrency} />}
        path="/customers/:customerId"
      />
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
      http.get(`${getBackendUrl()}/customers/:customerId/debts`, () =>
        HttpResponse.json(emptyDebtList),
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
    expect(screen.getByRole('region', { name: 'Debts' })).toBeInTheDocument();
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

  it('returns focus to the Add debt trigger after closing the drawer', async () => {
    const user = userEvent.setup();

    server.use(
      http.get(`${getBackendUrl()}/customers/:customerId`, () =>
        HttpResponse.json(baseCustomer),
      ),
    );

    renderCustomerRoutes([`/customers/${baseCustomer.id}`], {
      defaultCurrency: 'USD',
    });

    expect(
      await screen.findByRole('heading', { name: baseCustomer.name }),
    ).toBeInTheDocument();

    const addDebtButton = screen.getByRole('button', { name: 'Add debt' });
    await user.click(addDebtButton);
    await screen.findByRole('dialog', { name: 'Add debt' });

    await user.keyboard('{Escape}');

    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: 'Add debt' }),
      ).not.toBeInTheDocument(),
    );
    expect(addDebtButton).toHaveFocus();
  });

  it('opens the selected debt editor with its saved values', async () => {
    const user = userEvent.setup();
    const { drawer } = await openSelectedDebtEditor(user);

    expect(within(drawer).getByLabelText('Description')).toHaveValue(
      'Website redesign',
    );
    expect(within(drawer).getByLabelText('Total amount')).toHaveValue('275.75');
    expect(within(drawer).getByLabelText('Currency')).toHaveValue('EUR');
    expect(within(drawer).getByLabelText('Due date')).toHaveValue('2026-10-01');
  });

  it('returns focus to the debt menu trigger after closing the editor', async () => {
    const user = userEvent.setup();
    const { actionsTrigger } = await openSelectedDebtEditor(user);

    await user.keyboard('{Escape}');

    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Edit debt' })).not.toBeInTheDocument(),
    );
    expect(actionsTrigger).toHaveFocus();
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

async function openSelectedDebtEditor(
  user: ReturnType<typeof userEvent.setup>,
): Promise<{
  actionsTrigger: HTMLElement;
  drawer: HTMLElement;
}> {
  const debt = createDebtFixture(baseCustomer.id, {
    description: 'Website redesign',
    totalAmount: '275.75',
    currency: 'EUR',
    scheduleItems: [
      {
        id: 'schedule_123',
        position: 1,
        amount: '275.75',
        dueDate: '2026-10-01',
        timing: 'upcoming',
      },
    ],
  });

  server.use(
    http.get(`${getBackendUrl()}/customers/:customerId`, () =>
      HttpResponse.json(baseCustomer),
    ),
    http.get(`${getBackendUrl()}/customers/:customerId/debts`, () =>
      HttpResponse.json({
        ...emptyDebtList,
        items: [debt],
        totalItems: 1,
        totalPages: 1,
      }),
    ),
  );

  renderCustomerRoutes([`/customers/${baseCustomer.id}`], {
    defaultCurrency: 'USD',
  });

  await screen.findByRole('heading', { name: 'Website redesign' });
  const debtCard = screen
    .getByRole('heading', { name: 'Website redesign' })
    .closest('article');

  if (!debtCard) {
    throw new Error('Expected the debt heading to belong to a debt card.');
  }

  const actionsTrigger = within(debtCard).getByRole('button', {
    name: 'Open actions for Website redesign',
  });
  await user.click(actionsTrigger);
  const actionsMenu = await screen.findByRole('menu', {
    name: 'Actions for Website redesign',
  });
  await user.click(
    within(actionsMenu).getByRole('menuitem', { name: 'Edit debt' }),
  );

  return {
    actionsTrigger,
    drawer: await screen.findByRole('dialog', { name: 'Edit debt' }),
  };
}
