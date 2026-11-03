import '@testing-library/jest-dom/vitest';
import { cleanup, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  type DebtListResponse,
  type SessionResponse,
} from '@collectify/contracts';

import App from '../../../App';
import { getBackendUrl } from '../../../shared/api/http';
import { renderWithAppProviders } from '../../../shared/test/render';
import { server } from '../../../shared/test/server';
import { baseCustomer, resetCustomerTestEnvironment } from '../../customers/__tests__/customerTestData';
import { RouterLocationProbe } from '../../customers/__tests__/RouterLocationProbe';
import { debtResources } from '../localization/resources';
import {
  createDebtFixture,
  emptyDebtList,
} from './debtTestData';

const debtMessages = debtResources.en.common.debts;

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

describe('CustomerDebtLedger', () => {
  beforeEach(() => {
    resetCustomerTestEnvironment();
    window.localStorage.clear();
    document.documentElement.lang = '';
    document.documentElement.removeAttribute('dir');
    Object.defineProperty(window.navigator, 'languages', {
      configurable: true,
      value: ['en-US'],
    });
    server.use(
      http.get(`${getBackendUrl()}/session`, () =>
        HttpResponse.json(ownerSession),
      ),
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
    vi.useRealTimers();
  });


  describe('customer-route search', () => {
  it('debounces debt search and requests the first page while preserving unrelated URL parameters', async () => {
    const requestedQueries: Array<{
      page: string | null;
      search: string | null;
    }> = [];
    const initialDebt = createDebtFixture(baseCustomer.id, {
      description: 'Initial debt',
      id: 'debt_initial',
    });
    const searchedDebt = createDebtFixture(baseCustomer.id, {
      description: 'Website redesign',
      id: 'debt_searched',
    });

    server.use(
      http.get(`${getBackendUrl()}/customers/:customerId/debts`, ({ request }) => {
        const searchParams = new URL(request.url).searchParams;
        const query = {
          page: searchParams.get('page'),
          search: searchParams.get('search'),
        };
        requestedQueries.push(query);

        return HttpResponse.json({
          items: query.search ? [searchedDebt] : [initialDebt],
          page: Number(query.page ?? 1),
          pageSize: 5,
          totalItems: query.search ? 1 : 6,
          totalPages: query.search ? 1 : 2,
        } satisfies DebtListResponse);
      }),
    );

    renderCustomerDebtRoute([
      `/customers/${baseCustomer.id}?debtPage=2&view=summary`,
    ]);

    expect(await screen.findByText('Initial debt')).toBeInTheDocument();
    expect(requestedQueries).toEqual([{ page: '2', search: null }]);

    const user = userEvent.setup();
    const searchInput = screen.getByRole('searchbox', { name: debtMessages.search.label });
    await user.type(searchInput, 'redesign');

    expect(searchInput).toHaveValue('redesign');
    expect(requestedQueries).toEqual([{ page: '2', search: null }]);

    await waitFor(() =>
      expect(requestedQueries).toEqual([
        { page: '2', search: null },
        { page: '1', search: 'redesign' },
      ]),
    );
    await waitFor(() =>
      expect(screen.getByTestId('router-location')).toHaveTextContent(
        `/customers/${baseCustomer.id}?`,
      ),
    );
    const location = screen.getByTestId('router-location');
    expect(location).toHaveTextContent('debtPage=1');
    expect(location).toHaveTextContent('debtSearch=redesign');
    expect(location).toHaveTextContent('view=summary');
  });

  it('clears debt search, requests the first unfiltered page, and preserves unrelated URL parameters', async () => {
    const requestedQueries: Array<{
      page: string | null;
      search: string | null;
    }> = [];
    const filteredDebt = createDebtFixture(baseCustomer.id, {
      description: 'Website redesign',
      id: 'debt_filtered',
    });
    const unfilteredDebt = createDebtFixture(baseCustomer.id, {
      description: 'Unfiltered debt',
      id: 'debt_unfiltered',
    });

    server.use(
      http.get(`${getBackendUrl()}/customers/:customerId/debts`, ({ request }) => {
        const searchParams = new URL(request.url).searchParams;
        const query = {
          page: searchParams.get('page'),
          search: searchParams.get('search'),
        };
        requestedQueries.push(query);

        return HttpResponse.json({
          items: query.search ? [filteredDebt] : [unfilteredDebt],
          page: Number(query.page ?? 1),
          pageSize: 5,
          totalItems: query.search ? 6 : 1,
          totalPages: query.search ? 2 : 1,
        } satisfies DebtListResponse);
      }),
    );

    renderCustomerDebtRoute([
      `/customers/${baseCustomer.id}?debtPage=2&debtSearch=redesign&view=summary`,
    ]);

    expect(await screen.findByText('Website redesign')).toBeInTheDocument();
    expect(requestedQueries).toEqual([{ page: '2', search: 'redesign' }]);

    const user = userEvent.setup();
    const searchInput = screen.getByRole('searchbox', { name: debtMessages.search.label });
    await user.clear(searchInput);

    expect(searchInput).toHaveValue('');
    expect(requestedQueries).toEqual([{ page: '2', search: 'redesign' }]);

    await waitFor(() =>
      expect(requestedQueries).toEqual([
        { page: '2', search: 'redesign' },
        { page: '1', search: null },
      ]),
    );
    const location = screen.getByTestId('router-location');
    expect(location).toHaveTextContent('debtPage=1');
    expect(location).toHaveTextContent('view=summary');
    expect(location).not.toHaveTextContent('debtSearch=');
  });

  it('preserves debt search and unrelated URL parameters while paginating filtered debts', async () => {
    const user = userEvent.setup();
    const requestedQueries: Array<{
      page: string | null;
      search: string | null;
    }> = [];
    const firstFilteredDebt = createDebtFixture(baseCustomer.id, {
      description: 'First redesign debt',
      id: 'debt_filtered_page_one',
    });
    const secondFilteredDebt = createDebtFixture(baseCustomer.id, {
      description: 'Second redesign debt',
      id: 'debt_filtered_page_two',
    });

    server.use(
      http.get(`${getBackendUrl()}/customers/:customerId/debts`, ({ request }) => {
        const searchParams = new URL(request.url).searchParams;
        const query = {
          page: searchParams.get('page'),
          search: searchParams.get('search'),
        };
        requestedQueries.push(query);

        return HttpResponse.json({
          items: [
            query.page === '2' ? secondFilteredDebt : firstFilteredDebt,
          ],
          page: Number(query.page ?? 1),
          pageSize: 5,
          totalItems: 6,
          totalPages: 2,
        } satisfies DebtListResponse);
      }),
    );

    renderCustomerDebtRoute([
      `/customers/${baseCustomer.id}?debtPage=1&debtSearch=redesign&view=summary`,
    ]);

    expect(await screen.findByText('First redesign debt')).toBeInTheDocument();
    expect(requestedQueries).toEqual([{ page: '1', search: 'redesign' }]);

    await user.click(
      screen.getByRole('button', { name: debtMessages.list.pagination.nextPage }),
    );

    expect(await screen.findByText('Second redesign debt')).toBeInTheDocument();
    expect(requestedQueries).toEqual([
      { page: '1', search: 'redesign' },
      { page: '2', search: 'redesign' },
    ]);
    const location = screen.getByTestId('router-location');
    expect(location).toHaveTextContent('debtPage=2');
    expect(location).toHaveTextContent('debtSearch=redesign');
    expect(location).toHaveTextContent('view=summary');
  });
  });
});
function renderCustomerDebtRoute(initialEntries: string[]) {
  return renderWithAppProviders(
    <>
      <App />
      <RouterLocationProbe />
    </>,
    { initialEntries },
  );
}

