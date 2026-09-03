import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { getBackendUrl } from '../../../shared/api/http';
import { server } from '../../../shared/test/server';
import {
  baseCustomer,
  customerList,
  emptyCustomerList,
  northStarCustomer,
  resetCustomerTestEnvironment,
} from './customerTestData';
import { renderCustomerRoutes } from './renderCustomerRoutes';

describe('CustomersPage', () => {
  beforeEach(() => {
    resetCustomerTestEnvironment();
    server.use(
      http.get(`${getBackendUrl()}/customers`, () => HttpResponse.json(emptyCustomerList)),
    );
  });

  afterEach(() => {
    cleanup();
  });

  it('renders a customer from the list response', async () => {
    server.use(http.get(`${getBackendUrl()}/customers`, () => HttpResponse.json(customerList)));

    renderCustomerRoutes();

    expect(await screen.findByRole('cell', { name: 'Acme Market' })).toBeInTheDocument();
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

    expect(await screen.findByRole('cell', { name: 'North Star Cafe' })).toBeInTheDocument();
    expect(requestedPages).toEqual(['2']);
  });

  it('restores customer search from the URL and sends it to the backend', async () => {
    const requestedQueries: Array<{
      page: string | null;
      search: string | null;
    }> = [];
    server.use(
      http.get(`${getBackendUrl()}/customers`, ({ request }) => {
        const requestSearchParams = new URL(request.url).searchParams;
        requestedQueries.push({
          page: requestSearchParams.get('page'),
          search: requestSearchParams.get('search'),
        });

        return HttpResponse.json({
          ...customerList,
          page: 2,
          totalItems: 26,
          totalPages: 2,
        });
      }),
    );

    renderCustomerRoutes(['/customers?page=2&search=acme']);

    expect(await screen.findByLabelText('Search customers')).toHaveValue('acme');
    expect(await screen.findByRole('cell', { name: 'Acme Market' })).toBeInTheDocument();
    expect(requestedQueries).toEqual([{ page: '2', search: 'acme' }]);
  });

  it('restores customer search from browser history navigation', async () => {
    const requestedQueries: Array<{
      page: string | null;
      search: string | null;
    }> = [];
    server.use(
      http.get(`${getBackendUrl()}/customers`, ({ request }) => {
        const requestSearchParams = new URL(request.url).searchParams;
        const requestedSearch = requestSearchParams.get('search');
        requestedQueries.push({
          page: requestSearchParams.get('page'),
          search: requestedSearch,
        });

        return HttpResponse.json({
          ...customerList,
          items: requestedSearch === 'acme' ? [customerList.items[0]] : [customerList.items[1]],
        });
      }),
    );

    renderCustomerRoutes(['/customers?page=1&search=acme', '/customers?page=1&search=north']);

    const searchInput = await screen.findByLabelText('Search customers');
    expect(searchInput).toHaveValue('north');
    expect(await screen.findByRole('cell', { name: 'North Star Cafe' })).toBeInTheDocument();
    await waitFor(() => expect(requestedQueries).toEqual([{ page: '1', search: 'north' }]));

    fireEvent.click(screen.getByRole('button', { name: 'Go back' }));

    await waitFor(() => expect(searchInput).toHaveValue('acme'));
    expect(screen.getByTestId('router-location')).toHaveTextContent(
      '/customers?page=1&search=acme',
    );
    expect(await screen.findByRole('cell', { name: 'Acme Market' })).toBeInTheDocument();
    await waitFor(() =>
      expect(requestedQueries).toEqual([
        { page: '1', search: 'north' },
        { page: '1', search: 'acme' },
      ]),
    );
  });

  it('debounces customer search URL updates without overwriting continued typing', async () => {
    const requestedQueries: Array<{
      page: string | null;
      search: string | null;
    }> = [];
    server.use(
      http.get(`${getBackendUrl()}/customers`, ({ request }) => {
        const requestSearchParams = new URL(request.url).searchParams;
        requestedQueries.push({
          page: requestSearchParams.get('page'),
          search: requestSearchParams.get('search'),
        });

        return HttpResponse.json({
          ...customerList,
          page: Number(requestSearchParams.get('page') ?? 1),
          totalItems: 26,
          totalPages: 2,
        });
      }),
    );

    renderCustomerRoutes(['/customers?page=2']);

    const searchInput = await screen.findByLabelText('Search customers');
    await waitFor(() => expect(requestedQueries).toEqual([{ page: '2', search: null }]));

    fireEvent.change(searchInput, { target: { value: 'a' } });

    expect(searchInput).toHaveValue('a');
    expect(screen.getByTestId('router-location')).toHaveTextContent('/customers?page=2');
    expect(requestedQueries).toEqual([{ page: '2', search: null }]);

    await waitFor(() =>
      expect(requestedQueries).toEqual([
        { page: '2', search: null },
        { page: '1', search: 'a' },
      ]),
    );
    expect(screen.getByTestId('router-location')).toHaveTextContent(
      '/customers?page=1&search=a',
    );

    fireEvent.change(searchInput, { target: { value: 'ah' } });
    fireEvent.change(searchInput, { target: { value: 'ahm' } });

    expect(searchInput).toHaveValue('ahm');
    expect(screen.getByTestId('router-location')).toHaveTextContent(
      '/customers?page=1&search=a',
    );
    expect(requestedQueries).toEqual([
      { page: '2', search: null },
      { page: '1', search: 'a' },
    ]);

    await waitFor(() =>
      expect(requestedQueries).toEqual([
        { page: '2', search: null },
        { page: '1', search: 'a' },
        { page: '1', search: 'ahm' },
      ]),
    );
    expect(screen.getByTestId('router-location')).toHaveTextContent(
      '/customers?page=1&search=ahm',
    );
  });

  it('clears customer search from the URL and requests the unfiltered first page', async () => {
    const requestedQueries: Array<{
      page: string | null;
      search: string | null;
    }> = [];
    server.use(
      http.get(`${getBackendUrl()}/customers`, ({ request }) => {
        const requestSearchParams = new URL(request.url).searchParams;
        const requestedSearch = requestSearchParams.get('search');
        requestedQueries.push({
          page: requestSearchParams.get('page'),
          search: requestedSearch,
        });

        if (requestedSearch === 'acme') {
          return HttpResponse.json({
            ...customerList,
            items: [customerList.items[0]],
            page: 2,
            totalItems: 26,
            totalPages: 2,
          });
        }

        return HttpResponse.json(emptyCustomerList);
      }),
    );

    renderCustomerRoutes(['/customers?page=2&search=acme']);

    const searchInput = await screen.findByLabelText('Search customers');
    expect(searchInput).toHaveValue('acme');
    expect(await screen.findByRole('cell', { name: 'Acme Market' })).toBeInTheDocument();
    expect(requestedQueries).toEqual([{ page: '2', search: 'acme' }]);

    fireEvent.change(searchInput, { target: { value: '   ' } });

    expect(searchInput).toHaveValue('   ');

    await waitFor(() =>
      expect(requestedQueries).toEqual([
        { page: '2', search: 'acme' },
        { page: '1', search: null },
      ]),
    );
    expect(screen.getByTestId('router-location')).toHaveTextContent('/customers?page=1');
    await waitFor(() =>
      expect(
        screen.getAllByText('Create your first customer to start tracking debts.'),
      ).toHaveLength(2),
    );
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
    expect(screen.getByTestId('router-location')).toHaveTextContent('/customers?page=1');
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

    expect(await screen.findByRole('cell', { name: 'Acme Market' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Next page' }));

    await waitFor(() => expect(requestedPages).toEqual(['1', '2']));
    expect(screen.getByTestId('router-location')).toHaveTextContent('/customers?page=2');
    expect(await screen.findByRole('cell', { name: 'North Star Cafe' })).toBeInTheDocument();
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

    expect(await screen.findByRole('cell', { name: 'North Star Cafe' })).toBeInTheDocument();
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
      expect(screen.getByTestId('router-location')).toHaveTextContent('/customers?page=2');
      expect(screen.getByRole('status')).toHaveTextContent('Loading customers');
    } finally {
      resolveLastPageRequest();
    }

    expect(await screen.findByRole('cell', { name: 'North Star Cafe' })).toBeInTheDocument();
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
    expect(screen.getByTestId('router-location')).toHaveTextContent('/customers?page=1');
    expect(screen.getAllByText('Create your first customer to start tracking debts.')).toHaveLength(
      2,
    );
    expect(screen.queryByRole('button', { name: 'Previous page' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Next page' })).not.toBeInTheDocument();
  });

  it('replaces the current customer page while the next page loads and updates pagination controls', async () => {
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

    expect(await screen.findByRole('cell', { name: 'Acme Market' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Next page' }));
    await waitFor(() => expect(requestedPages).toEqual(['1', '2']));

    try {
      expect(screen.queryByRole('cell', { name: 'Acme Market' })).not.toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveTextContent('Loading customers');
      expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
    } finally {
      resolveNextPageRequest();
    }

    expect(await screen.findByRole('cell', { name: 'North Star Cafe' })).toBeInTheDocument();
  });

  it('replaces the current customer page while the previous page loads and updates pagination controls', async () => {
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

    expect(await screen.findByRole('cell', { name: 'North Star Cafe' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Previous page' }));
    await waitFor(() => expect(requestedPages).toEqual(['2', '1']));

    try {
      expect(screen.queryByRole('cell', { name: 'North Star Cafe' })).not.toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveTextContent('Loading customers');
      expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
    } finally {
      resolvePreviousPageRequest();
    }

    expect(await screen.findByRole('cell', { name: 'Acme Market' })).toBeInTheDocument();
  });

  it('renders the customer table loading state while the list request is pending', async () => {
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

    expect(await screen.findByRole('status')).toHaveTextContent('Loading customers');
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();

    resolveCustomerListRequest();
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());
  });

  it('shows the empty state instead of the table when the customer list has no items', async () => {
    renderCustomerRoutes();

    await waitFor(() =>
      expect(
        screen.getAllByText('Create your first customer to start tracking debts.'),
      ).toHaveLength(2),
    );
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Name' })).not.toBeInTheDocument();
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

    expect(await screen.findByRole('cell', { name: 'North Star Cafe' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'NSC-002' })).toBeInTheDocument();
    expect(
      screen.queryByRole('alert', { name: 'Could not load customers' }),
    ).not.toBeInTheDocument();
    expect(customerListRequestCount).toBe(2);
  });

  it('navigates from a customer row to that customer details page', async () => {
    const user = userEvent.setup();
    server.use(
      http.get(`${getBackendUrl()}/customers`, () => HttpResponse.json(customerList)),
      http.get(`${getBackendUrl()}/customers/:customerId`, ({ params }) => {
        if (params.customerId !== northStarCustomer.id) {
          return HttpResponse.json(
            {
              code: 'CUSTOMER_NOT_FOUND',
              message: 'Customer was not found.',
            },
            { status: 404 },
          );
        }

        return HttpResponse.json(northStarCustomer);
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
    await user.click(await screen.findByRole('menuitem', { name: 'Open details' }));

    expect(await screen.findByRole('heading', { name: 'North Star Cafe' })).toBeInTheDocument();
  });

  it('creates a customer, shows a success toast, and navigates to durable details', async () => {
    server.use(
      http.post(`${getBackendUrl()}/customers`, () =>
        HttpResponse.json(baseCustomer, { status: 201 }),
      ),
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

    fireEvent.click(await screen.findByRole('button', { name: 'Create customer' }));
    fillCreateCustomerForm({
      code: 'ACME-001',
      name: 'Acme Market',
      phoneNumber: '+90 555 123 45 67',
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save customer' }));

    expect(await screen.findByRole('status', { name: 'Customer created' })).toHaveTextContent(
      'Acme Market is ready for debt tracking.',
    );
    expect(await screen.findByRole('heading', { name: 'Acme Market' })).toBeInTheDocument();
    expect(screen.getByText('Code: ACME-001')).toBeInTheDocument();
  });

  it('shows a duplicate-code create error toast and keeps the create modal open', async () => {
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

    fireEvent.click(await screen.findByRole('button', { name: 'Create customer' }));
    fillCreateCustomerForm({
      code: 'ACME-001',
      name: 'Acme Market',
      phoneNumber: '+90 555 123 45 67',
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save customer' }));

    expect(
      await screen.findByRole('alert', { name: 'Could not create customer' }),
    ).toHaveTextContent('A customer with this code already exists.');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toHaveValue('Acme Market');
  });

  // TODO: Cover same-query list refresh once a visible list action invalidates customers without leaving this page.
});

function fillCreateCustomerForm({
  address,
  code,
  name,
  phoneNumber,
}: {
  address?: string;
  code: string;
  name: string;
  phoneNumber: string;
}) {
  fireEvent.change(screen.getByLabelText('Name'), {
    target: { value: name },
  });
  fireEvent.change(screen.getByLabelText('Code'), {
    target: { value: code },
  });
  fireEvent.change(screen.getByLabelText('Phone number'), {
    target: { value: phoneNumber },
  });

  if (address !== undefined) {
    fireEvent.change(screen.getByLabelText('Address'), {
      target: { value: address },
    });
  }
}
