import '@testing-library/jest-dom/vitest';
import {
  cleanup,
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { Route, Routes, useLocation } from 'react-router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  createCustomerRequestSchema,
  type CustomerDetailsResponse,
  type CustomerListResponse,
} from '@collectify/contracts';

import { getBackendUrl } from '../../../shared/api/http';
import { renderWithAppProviders } from '../../../shared/test/render';
import { server } from '../../../shared/test/server';
import { CustomerDetailsPage } from '../details/CustomerDetailsPage';
import {
  baseCustomer,
  customerList,
  emptyCustomerList,
} from '../test/customerFixtures';
import { CustomersPage } from './CustomersPage';

function renderCustomerRoutes(initialEntries: string[] = ['/customers']) {
  return renderWithAppProviders(
    <>
      <Routes>
        <Route element={<CustomersPage />} path="/customers" />
        <Route element={<CustomerDetailsPage />} path="/customers/:customerId" />
      </Routes>
      <RouterLocationProbe />
    </>,
    { initialEntries },
  );
}

function RouterLocationProbe() {
  const location = useLocation();

  return (
    <div data-testid="router-location">
      {location.pathname}
      {location.search}
    </div>
  );
}

function setBrowserLanguages(languages: readonly string[]) {
  Object.defineProperty(window.navigator, 'languages', {
    configurable: true,
    value: languages,
  });
}

describe('CustomersPage', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.lang = '';
    document.documentElement.removeAttribute('dir');
    setBrowserLanguages(['en-US']);
    server.use(
      http.get(`${getBackendUrl()}/customers`, () =>
        HttpResponse.json(emptyCustomerList),
      ),
    );
  });

  afterEach(() => {
    cleanup();
  });

  it('renders the customer directory table from the list response', async () => {
    server.use(
      http.get(`${getBackendUrl()}/customers`, () =>
        HttpResponse.json(customerList),
      ),
    );

    renderCustomerRoutes();

    expect(
      await screen.findByRole('columnheader', { name: 'Name' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: 'Code' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Phone' })).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: 'Remaining debt' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: 'Overdue amount' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: 'Next due date' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: 'Actions' }),
    ).toBeInTheDocument();

    expect(screen.getByRole('cell', { name: 'Acme Market' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'ACME-001' })).toBeInTheDocument();
    expect(
      screen.getByRole('cell', { name: '+90 555 123 45 67' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('cell', { name: 'North Star Cafe' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'NSC-002' })).toBeInTheDocument();
    expect(
      screen.getByRole('cell', { name: '+90 555 456 78 90' }),
    ).toBeInTheDocument();
  });

  it('requests the customer page from the URL query', async () => {
    const requestedPages: Array<string | null> = [];
    server.use(
      http.get(`${getBackendUrl()}/customers`, ({ request }) => {
        requestedPages.push(new URL(request.url).searchParams.get('page'));

        return HttpResponse.json({
          ...customerList,
          page: 2,
          totalItems: 26,
          totalPages: 2,
        });
      }),
    );

    renderCustomerRoutes(['/customers?page=2']);

    expect(
      await screen.findByRole('cell', { name: 'North Star Cafe' }),
    ).toBeInTheDocument();
    expect(requestedPages).toEqual(['2']);
  });

  it('normalizes an invalid customer page query to the first page URL', async () => {
    const requestedPages: Array<string | null> = [];
    server.use(
      http.get(`${getBackendUrl()}/customers`, ({ request }) => {
        requestedPages.push(new URL(request.url).searchParams.get('page'));

        return HttpResponse.json(customerList);
      }),
    );

    renderCustomerRoutes(['/customers?page=invalid']);

    await waitFor(() => expect(requestedPages).toEqual(['1']));
    expect(screen.getByTestId('router-location')).toHaveTextContent(
      '/customers?page=1',
    );
  });

  it('moves to the next customer page with pagination controls', async () => {
    const user = userEvent.setup();
    const requestedPages: Array<string | null> = [];
    server.use(
      http.get(`${getBackendUrl()}/customers`, ({ request }) => {
        const requestedPage = new URL(request.url).searchParams.get('page');
        requestedPages.push(requestedPage);

        if (requestedPage === '2') {
          return HttpResponse.json({
            ...customerList,
            items: [customerList.items[1]],
            page: 2,
            totalItems: 26,
            totalPages: 2,
          });
        }

        return HttpResponse.json({
          ...customerList,
          items: [customerList.items[0]],
          page: 1,
          totalItems: 26,
          totalPages: 2,
        });
      }),
    );

    renderCustomerRoutes(['/customers?page=1']);

    expect(
      await screen.findByRole('cell', { name: 'Acme Market' }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Next page' }));

    await waitFor(() => expect(requestedPages).toEqual(['1', '2']));
    expect(screen.getByTestId('router-location')).toHaveTextContent(
      '/customers?page=2',
    );
    expect(
      await screen.findByRole('cell', { name: 'North Star Cafe' }),
    ).toBeInTheDocument();
  });

  it('disables the next customer page control on the last page', async () => {
    server.use(
      http.get(`${getBackendUrl()}/customers`, () =>
        HttpResponse.json({
          ...customerList,
          items: [customerList.items[1]],
          page: 2,
          totalItems: 26,
          totalPages: 2,
        }),
      ),
    );

    renderCustomerRoutes(['/customers?page=2']);

    expect(
      await screen.findByRole('cell', { name: 'North Star Cafe' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
  });

  it('normalizes an out-of-range customer page query to the last available page', async () => {
    const requestedPages: Array<string | null> = [];
    let resolveLastPageRequest!: () => void;
    const pendingLastPageRequest = new Promise<void>((resolve) => {
      resolveLastPageRequest = resolve;
    });
    server.use(
      http.get(`${getBackendUrl()}/customers`, async ({ request }) => {
        const requestedPage = new URL(request.url).searchParams.get('page');
        requestedPages.push(requestedPage);

        if (requestedPage === '2') {
          await pendingLastPageRequest;

          return HttpResponse.json({
            ...customerList,
            items: [customerList.items[1]],
            page: 2,
            totalItems: 26,
            totalPages: 2,
          });
        }

        return HttpResponse.json({
          ...customerList,
          items: [],
          page: 99,
          totalItems: 26,
          totalPages: 2,
        });
      }),
    );

    renderCustomerRoutes(['/customers?page=99']);

    await waitFor(() => expect(requestedPages).toEqual(['99', '2']));

    try {
      expect(screen.getByTestId('router-location')).toHaveTextContent(
        '/customers?page=2',
      );
      expect(screen.getByRole('status')).toHaveTextContent('Loading customers');
      expect(screen.queryByRole('table')).not.toBeInTheDocument();
    } finally {
      resolveLastPageRequest();
    }

    expect(
      await screen.findByRole('cell', { name: 'North Star Cafe' }),
    ).toBeInTheDocument();
  });

  it('normalizes an out-of-range empty customer page query to the first page', async () => {
    const requestedPages: Array<string | null> = [];
    server.use(
      http.get(`${getBackendUrl()}/customers`, ({ request }) => {
        requestedPages.push(new URL(request.url).searchParams.get('page'));

        return HttpResponse.json({
          ...emptyCustomerList,
          page: Number(new URL(request.url).searchParams.get('page') ?? 1),
        });
      }),
    );

    renderCustomerRoutes(['/customers?page=99']);

    await waitFor(() => expect(requestedPages).toEqual(['99', '1']));
    expect(screen.getByTestId('router-location')).toHaveTextContent(
      '/customers?page=1',
    );
    expect(
      screen.getAllByText('Create your first customer to start tracking debts.'),
    ).toHaveLength(2);
    expect(
      screen.queryByRole('button', { name: 'Previous page' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Next page' }),
    ).not.toBeInTheDocument();
  });

  it('keeps the current customer page visible while the next page loads and updates pagination controls', async () => {
    const user = userEvent.setup();
    const requestedPages: Array<string | null> = [];
    let resolveNextPageRequest!: () => void;
    const pendingNextPageRequest = new Promise<void>((resolve) => {
      resolveNextPageRequest = resolve;
    });
    server.use(
      http.get(`${getBackendUrl()}/customers`, async ({ request }) => {
        const requestedPage = new URL(request.url).searchParams.get('page');
        requestedPages.push(requestedPage);

        if (requestedPage === '2') {
          await pendingNextPageRequest;

          return HttpResponse.json({
            ...customerList,
            items: [customerList.items[1]],
            page: 2,
            totalItems: 26,
            totalPages: 2,
          });
        }

        return HttpResponse.json({
          ...customerList,
          items: [customerList.items[0]],
          page: 1,
          totalItems: 26,
          totalPages: 2,
        });
      }),
    );

    renderCustomerRoutes(['/customers?page=1']);

    expect(
      await screen.findByRole('cell', { name: 'Acme Market' }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Next page' }));
    await waitFor(() => expect(requestedPages).toEqual(['1', '2']));

    try {
      expect(screen.getByRole('cell', { name: 'Acme Market' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Previous page' })).toBeEnabled();
      expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
    } finally {
      resolveNextPageRequest();
    }
  });

  it('keeps the current customer page visible while the previous page loads and updates pagination controls', async () => {
    const user = userEvent.setup();
    const requestedPages: Array<string | null> = [];
    let resolvePreviousPageRequest!: () => void;
    const pendingPreviousPageRequest = new Promise<void>((resolve) => {
      resolvePreviousPageRequest = resolve;
    });
    server.use(
      http.get(`${getBackendUrl()}/customers`, async ({ request }) => {
        const requestedPage = new URL(request.url).searchParams.get('page');
        requestedPages.push(requestedPage);

        if (requestedPage === '1') {
          await pendingPreviousPageRequest;

          return HttpResponse.json({
            ...customerList,
            items: [customerList.items[0]],
            page: 1,
            totalItems: 26,
            totalPages: 2,
          });
        }

        return HttpResponse.json({
          ...customerList,
          items: [customerList.items[1]],
          page: 2,
          totalItems: 26,
          totalPages: 2,
        });
      }),
    );

    renderCustomerRoutes(['/customers?page=2']);

    expect(
      await screen.findByRole('cell', { name: 'North Star Cafe' }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Previous page' }));
    await waitFor(() => expect(requestedPages).toEqual(['2', '1']));

    try {
      expect(
        screen.getByRole('cell', { name: 'North Star Cafe' }),
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Next page' })).toBeEnabled();
    } finally {
      resolvePreviousPageRequest();
    }
  });

  it('shows a loading status while the customer list request is pending', async () => {
    let resolveCustomerListRequest!: () => void;
    const pendingCustomerListRequest = new Promise<void>((resolve) => {
      resolveCustomerListRequest = resolve;
    });
    server.use(
      http.get(`${getBackendUrl()}/customers`, async () => {
        await pendingCustomerListRequest;

        return HttpResponse.json(emptyCustomerList);
      }),
    );

    renderCustomerRoutes();

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Loading customers',
    );

    resolveCustomerListRequest();
    await waitFor(() =>
      expect(screen.queryByRole('status')).not.toBeInTheDocument(),
    );
  });

  it('shows the empty state instead of the table when the customer list has no items', async () => {
    renderCustomerRoutes();

    await waitFor(() =>
      expect(
        screen.getAllByText('Create your first customer to start tracking debts.'),
      ).toHaveLength(2),
    );
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('columnheader', { name: 'Name' }),
    ).not.toBeInTheDocument();
  });

  it('shows a recoverable error and reloads customers on retry', async () => {
    const user = userEvent.setup();
    let customerListRequestCount = 0;
    server.use(
      http.get(`${getBackendUrl()}/customers`, () => {
        customerListRequestCount += 1;

        if (customerListRequestCount === 1) {
          return HttpResponse.text('Internal server error', { status: 500 });
        }

        return HttpResponse.json(customerList);
      }),
    );

    renderCustomerRoutes();

    const errorState = await screen.findByRole('alert', {
      name: 'Could not load customers',
    });
    expect(errorState).toHaveTextContent('Something went wrong. Try again.');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();

    await user.click(within(errorState).getByRole('button', { name: 'Try again' }));

    expect(
      await screen.findByRole('cell', { name: 'North Star Cafe' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'NSC-002' })).toBeInTheDocument();
    expect(
      screen.queryByRole('alert', { name: 'Could not load customers' }),
    ).not.toBeInTheDocument();
    expect(customerListRequestCount).toBe(2);
  });

  it('opens a customer row actions menu and navigates to that customer details', async () => {
    const user = userEvent.setup();
    const northStarDetails: CustomerDetailsResponse = {
      ...baseCustomer,
      id: 'customer_456',
      name: 'North Star Cafe',
      code: 'NSC-002',
      phoneNumber: '+90 555 456 78 90',
      createdAt: '2026-08-29T12:00:00.000Z',
      updatedAt: '2026-08-29T12:00:00.000Z',
    };
    const requestedCustomerIds: string[] = [];
    server.use(
      http.get(`${getBackendUrl()}/customers`, () =>
        HttpResponse.json(customerList),
      ),
      http.get(`${getBackendUrl()}/customers/:customerId`, ({ params }) => {
        requestedCustomerIds.push(String(params.customerId));

        if (params.customerId !== northStarDetails.id) {
          return HttpResponse.json(
            {
              code: 'CUSTOMER_NOT_FOUND',
              message: 'Customer was not found.',
            },
            { status: 404 },
          );
        }

        return HttpResponse.json(northStarDetails);
      }),
    );

    renderCustomerRoutes();

    const northStarRow = await screen.findByRole('row', {
      name: /North Star Cafe/,
    });
    await user.click(
      within(northStarRow).getByRole('button', {
        name: 'Open actions for North Star Cafe',
      }),
    );

    const actionsMenu = await screen.findByRole('menu', {
      name: 'Actions for North Star Cafe',
    });
    await user.click(
      within(actionsMenu).getByRole('menuitem', { name: 'Open details' }),
    );

    expect(
      await screen.findByRole('heading', { name: 'North Star Cafe' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Code: NSC-002')).toBeInTheDocument();
    expect(requestedCustomerIds).toEqual(['customer_456']);
  });

  it('opens additional currency balances as a mobile-friendly popover', async () => {
    const user = userEvent.setup();
    const financialCustomerList: CustomerListResponse = {
      items: [
        {
          id: 'customer_financial',
          name: 'South Ledger',
          code: 'SL-003',
          phoneNumber: '+90 555 700 00 03',
          createdAt: '2026-08-30T12:00:00.000Z',
          updatedAt: '2026-08-30T12:00:00.000Z',
          financialSummary: {
            balancesByCurrency: [
              {
                currency: 'USD',
                remainingAmount: '125.50',
                overdueAmount: '5.00',
              },
              {
                currency: 'EUR',
                remainingAmount: '80.00',
                overdueAmount: '0.00',
              },
              {
                currency: 'TRY',
                remainingAmount: '12.30',
                overdueAmount: '2.00',
              },
            ],
            nextDueDate: '2026-09-15',
          },
        },
      ],
      page: 1,
      pageSize: 25,
      totalItems: 1,
      totalPages: 1,
    };
    server.use(
      http.get(`${getBackendUrl()}/customers`, () =>
        HttpResponse.json(financialCustomerList),
      ),
    );

    renderCustomerRoutes();

    const customerRow = await screen.findByRole('row', {
      name: /South Ledger/,
    });
    expect(within(customerRow).getByText(/125\.50 USD/)).toBeInTheDocument();
    expect(within(customerRow).queryByText(/80\.00 EUR/)).not.toBeInTheDocument();
    expect(within(customerRow).queryByText(/12\.30 TRY/)).not.toBeInTheDocument();

    const remainingExtraCurrencies = within(customerRow).getByRole('button', {
      name: 'Show 2 more remaining debt currencies for South Ledger',
    });
    expect(remainingExtraCurrencies).toHaveTextContent('+2 currencies');

    await user.click(remainingExtraCurrencies);

    const currencyPopover = await screen.findByRole('dialog', {
      name: 'Remaining debt currencies for South Ledger',
    });
    expect(
      within(currencyPopover).getByRole('heading', { name: 'Remaining debt' }),
    ).toBeInTheDocument();

    const currencyRows = within(currencyPopover).getAllByRole('listitem');
    expect(currencyRows).toHaveLength(2);
    expect(currencyRows[0]).toHaveTextContent('EUR');
    expect(currencyRows[0]).toHaveTextContent('80.00');
    expect(currencyRows[1]).toHaveTextContent('TRY');
    expect(currencyRows[1]).toHaveTextContent('12.30');

    await user.keyboard('{Escape}');
    expect(
      screen.queryByRole('dialog', {
        name: 'Remaining debt currencies for South Ledger',
      }),
    ).not.toBeInTheDocument();

    await user.click(remainingExtraCurrencies);
    expect(
      await screen.findByRole('dialog', {
        name: 'Remaining debt currencies for South Ledger',
      }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('heading', { name: 'Customers' }));
    expect(
      screen.queryByRole('dialog', {
        name: 'Remaining debt currencies for South Ledger',
      }),
    ).not.toBeInTheDocument();
  });

  it('closes the create modal without posting and clears draft values', async () => {
    const user = userEvent.setup();
    let createRequestCount = 0;
    server.use(
      http.post(`${getBackendUrl()}/customers`, () => {
        createRequestCount += 1;

        return HttpResponse.json(baseCustomer, { status: 201 });
      }),
    );

    renderCustomerRoutes();

    await user.click(await screen.findByRole('button', { name: 'Create customer' }));
    await user.type(screen.getByLabelText('Name'), 'Draft Customer');
    await user.click(screen.getByRole('button', { name: 'Close customer form' }));

    await user.click(screen.getByRole('button', { name: 'Create customer' }));
    expect(screen.getByLabelText('Name')).toHaveValue('');
    await user.type(screen.getByLabelText('Name'), 'Draft Customer');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    await user.click(screen.getByRole('button', { name: 'Create customer' }));
    expect(screen.getByLabelText('Name')).toHaveValue('');
    await user.type(screen.getByLabelText('Name'), 'Draft Customer');
    fireEvent.mouseDown(screen.getByRole('dialog'));

    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    expect(createRequestCount).toBe(0);
  });

  it('creates a customer, shows a success toast, and navigates to durable details', async () => {
    const user = userEvent.setup();
    let capturedCreateBody: unknown;
    server.use(
      http.post(`${getBackendUrl()}/customers`, async ({ request }) => {
        capturedCreateBody = await request.json();
        const createRequestResult =
          createCustomerRequestSchema.safeParse(capturedCreateBody);

        if (!createRequestResult.success) {
          return HttpResponse.json(
            {
              code: 'VALIDATION_ERROR',
              message: 'Check the highlighted fields.',
            },
            { status: 400 },
          );
        }

        return HttpResponse.json(baseCustomer, { status: 201 });
      }),
      http.get(`${getBackendUrl()}/customers/:customerId`, ({ params }) => {
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

    renderCustomerRoutes();

    await user.click(await screen.findByRole('button', { name: 'Create customer' }));
    await user.type(screen.getByLabelText('Name'), '  Acme Market  ');
    await user.type(screen.getByLabelText('Code'), '  ACME-001  ');
    await user.type(
      screen.getByLabelText('Phone number'),
      '  +90 555 123 45 67  ',
    );
    await user.type(screen.getByLabelText('Address'), '   ');
    await user.click(screen.getByRole('button', { name: 'Save customer' }));

    expect(
      await screen.findByRole('status', { name: 'Customer created' }),
    ).toHaveTextContent('Acme Market is ready for debt tracking.');
    expect(
      await screen.findByRole('heading', { name: 'Acme Market' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Code: ACME-001')).toBeInTheDocument();
    expect(capturedCreateBody).toEqual({
      name: 'Acme Market',
      code: 'ACME-001',
      phoneNumber: '+90 555 123 45 67',
    });
  });

  it('keeps entered values and shows the duplicate-code toast when creation fails', async () => {
    const user = userEvent.setup();
    server.use(
      http.post(`${getBackendUrl()}/customers`, () =>
        HttpResponse.json(
          {
            code: 'CUSTOMER_CODE_ALREADY_EXISTS',
            message: 'A customer with this code already exists.',
            fieldErrors: {
              code: ['A customer with this code already exists.'],
            },
          },
          { status: 409 },
        ),
      ),
    );

    renderCustomerRoutes();

    await user.click(await screen.findByRole('button', { name: 'Create customer' }));
    await user.type(screen.getByLabelText('Name'), 'Acme Market');
    await user.type(screen.getByLabelText('Code'), 'ACME-001');
    await user.type(screen.getByLabelText('Phone number'), '+90 555 123 45 67');
    await user.click(screen.getByRole('button', { name: 'Save customer' }));

    expect(
      await screen.findByRole('alert', { name: 'Could not create customer' }),
    ).toHaveTextContent('A customer with this code already exists.');
    expect(screen.getByLabelText('Name')).toHaveValue('Acme Market');
    expect(screen.getByLabelText('Code')).toHaveValue('ACME-001');
    expect(screen.getByLabelText('Phone number')).toHaveValue(
      '+90 555 123 45 67',
    );
  });

  it('keeps entered values and shows the generic toast when creation fails unexpectedly', async () => {
    const user = userEvent.setup();
    server.use(
      http.post(`${getBackendUrl()}/customers`, () =>
        HttpResponse.text('Internal server error', { status: 500 }),
      ),
    );

    renderCustomerRoutes();

    await user.click(await screen.findByRole('button', { name: 'Create customer' }));
    await user.type(screen.getByLabelText('Name'), 'Acme Market');
    await user.type(screen.getByLabelText('Code'), 'ACME-001');
    await user.type(screen.getByLabelText('Phone number'), '+90 555 123 45 67');
    await user.type(screen.getByLabelText('Address'), '42 Market Street');
    await user.click(screen.getByRole('button', { name: 'Save customer' }));

    expect(
      await screen.findByRole('alert', { name: 'Could not create customer' }),
    ).toHaveTextContent('Something went wrong. Try again.');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toHaveValue('Acme Market');
    expect(screen.getByLabelText('Code')).toHaveValue('ACME-001');
    expect(screen.getByLabelText('Phone number')).toHaveValue(
      '+90 555 123 45 67',
    );
    expect(screen.getByLabelText('Address')).toHaveValue('42 Market Street');
  });
});
