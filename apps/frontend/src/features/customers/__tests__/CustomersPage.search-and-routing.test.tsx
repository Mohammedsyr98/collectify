import '@testing-library/jest-dom/vitest';
import { cleanup, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { getBackendUrl } from '../../../shared/api/http';
import { server } from '../../../shared/test/server';
import { customerResources } from '../localization/resources';
import {
  customerList,
  emptyCustomerList,
  resetCustomerTestEnvironment,
} from './customerTestData';
import { renderCustomerRoutes } from './renderCustomerRoutes';

const customerMessages = customerResources.en.common.customers;

describe('CustomersPage search and URL state', () => {
  beforeEach(() => {
    resetCustomerTestEnvironment();
    server.use(
      http.get(`${getBackendUrl()}/customers`, () => HttpResponse.json(emptyCustomerList)),
    );
  });

  afterEach(() => {
    cleanup();
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

    expect(await screen.findByLabelText(customerMessages.search.label)).toHaveValue('acme');
    expect(await screen.findByRole('cell', { name: 'Acme Market' })).toBeInTheDocument();
    expect(requestedQueries).toEqual([{ page: '2', search: 'acme' }]);
  });

  it('restores customer search from browser history navigation', async () => {
    const user = userEvent.setup();
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

    const searchInput = await screen.findByLabelText(customerMessages.search.label);
    expect(searchInput).toHaveValue('north');
    expect(await screen.findByRole('cell', { name: 'North Star Cafe' })).toBeInTheDocument();
    await waitFor(() => expect(requestedQueries).toEqual([{ page: '1', search: 'north' }]));

    await user.click(screen.getByRole('button', { name: 'Go back' }));

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
    const user = userEvent.setup();
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

    const searchInput = await screen.findByLabelText(customerMessages.search.label);
    await waitFor(() => expect(requestedQueries).toEqual([{ page: '2', search: null }]));

    await user.type(searchInput, 'a');

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

    await user.type(searchInput, 'hm');

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
    const user = userEvent.setup();
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

    const searchInput = await screen.findByLabelText(customerMessages.search.label);
    expect(searchInput).toHaveValue('acme');
    expect(await screen.findByRole('cell', { name: 'Acme Market' })).toBeInTheDocument();
    expect(requestedQueries).toEqual([{ page: '2', search: 'acme' }]);

    await user.clear(searchInput);
    await user.type(searchInput, '   ');

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
        screen.getAllByText(customerMessages.page.empty),
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
});
