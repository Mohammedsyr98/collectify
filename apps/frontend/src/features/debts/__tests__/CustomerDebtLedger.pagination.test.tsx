import '@testing-library/jest-dom/vitest';
import { cleanup, screen, waitFor, within } from '@testing-library/react';
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
import { customerResources } from '../../customers/localization/resources';
import { debtResources } from '../localization/resources';
import {
  createDebtFixture,
  emptyDebtList,
} from './debtTestData';

const customerMessages = customerResources.en.common.customers;
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


  describe('customer-route pagination', () => {
  it('shows debt skeletons and disables pagination while the next page loads', async () => {
    const user = userEvent.setup();
    const firstPageDebt = createDebtFixture(baseCustomer.id, {
      description: 'Page one debt',
      id: 'debt_page_one',
    });
    const secondPageDebt = createDebtFixture(baseCustomer.id, {
      description: 'Page two debt',
      id: 'debt_page_two',
    });
    const requestedPages: string[] = [];
    let resolveNextPageRequest!: () => void;
    const pendingNextPageRequest = new Promise<void>((resolve) => {
      resolveNextPageRequest = resolve;
    });

    server.use(
      http.get(`${getBackendUrl()}/customers/:customerId/debts`, async ({ request }) => {
        const page = new URL(request.url).searchParams.get('page') ?? '';
        requestedPages.push(page);

        if (page === '2') {
          await pendingNextPageRequest;

          return HttpResponse.json({
            items: [secondPageDebt],
            page: 2,
            pageSize: 5,
            totalItems: 6,
            totalPages: 2,
          } satisfies DebtListResponse);
        }

        return HttpResponse.json({
          items: [firstPageDebt],
          page: 1,
          pageSize: 5,
          totalItems: 6,
          totalPages: 2,
        } satisfies DebtListResponse);
      }),
    );

    renderCustomerDebtRoute([`/customers/${baseCustomer.id}?debtPage=1`]);

    expect(await screen.findByText('Page one debt')).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: debtMessages.list.pagination.nextPage }),
    );
    await waitFor(() => expect(requestedPages).toEqual(['1', '2']));

    try {
      const debtRegion = screen.getByRole('region', { name: debtMessages.section.title });

      expect(within(debtRegion).queryByText('Page one debt')).not.toBeInTheDocument();
      expect(
        within(debtRegion).getAllByTestId('debt-card-skeleton'),
      ).toHaveLength(5);

      const pagination = within(debtRegion).getByRole('navigation', {
        name: debtMessages.list.pagination.label,
      });

      expect(
        within(pagination).getByRole('button', {
          name: debtMessages.list.pagination.previousPage,
        }),
      ).toBeDisabled();
      expect(
        within(pagination).getByRole('button', {
          name: debtMessages.list.pagination.nextPage,
        }),
      ).toBeDisabled();
      expect(
        screen.getByRole('heading', { name: baseCustomer.name }),
      ).toBeInTheDocument();
      expect(screen.getByRole('region', { name: customerMessages.details.payments })).toBeInTheDocument();
    } finally {
      resolveNextPageRequest();
    }

    expect(await screen.findByText('Page two debt')).toBeInTheDocument();
  });

  it('loads the debt page named by debtPage', async () => {
    const requestedPages: string[] = [];
    const secondPageDebt = createDebtFixture(baseCustomer.id, {
      description: 'Page two debt',
      id: 'debt_page_two',
    });

    server.use(
      http.get(`${getBackendUrl()}/customers/:customerId/debts`, ({ request }) => {
        requestedPages.push(new URL(request.url).searchParams.get('page') ?? '');

        return HttpResponse.json({
          items: [secondPageDebt],
          page: 2,
          pageSize: 5,
          totalItems: 6,
          totalPages: 2,
        } satisfies DebtListResponse);
      }),
    );

    renderCustomerDebtRoute([`/customers/${baseCustomer.id}?debtPage=2`]);

    expect(await screen.findByText('Page two debt')).toBeInTheDocument();
    expect(requestedPages).toEqual(['2']);
  });

  it('moves to the next debt page and updates debtPage', async () => {
    const user = userEvent.setup();
    const requestedPages: string[] = [];
    const firstPageDebt = createDebtFixture(baseCustomer.id, {
      description: 'Page one debt',
      id: 'debt_page_one',
    });
    const secondPageDebt = createDebtFixture(baseCustomer.id, {
      description: 'Page two debt',
      id: 'debt_page_two',
    });

    server.use(
      http.get(`${getBackendUrl()}/customers/:customerId/debts`, ({ request }) => {
        const page = new URL(request.url).searchParams.get('page') ?? '';
        requestedPages.push(page);

        return HttpResponse.json({
          items: [page === '2' ? secondPageDebt : firstPageDebt],
          page: page === '2' ? 2 : 1,
          pageSize: 5,
          totalItems: 6,
          totalPages: 2,
        } satisfies DebtListResponse);
      }),
    );

    renderCustomerDebtRoute([`/customers/${baseCustomer.id}?debtPage=1`]);

    expect(await screen.findByText('Page one debt')).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: debtMessages.list.pagination.nextPage }),
    );

    expect(await screen.findByText('Page two debt')).toBeInTheDocument();
    expect(requestedPages).toEqual(['1', '2']);
    expect(screen.getByTestId('router-location')).toHaveTextContent(
      `/customers/${baseCustomer.id}?debtPage=2`,
    );
  });

  it('preserves unrelated URL parameters when navigating debt pages', async () => {
    const user = userEvent.setup();
    const firstPageDebt = createDebtFixture(baseCustomer.id, {
      description: 'Page one debt',
      id: 'debt_page_one',
    });
    const secondPageDebt = createDebtFixture(baseCustomer.id, {
      description: 'Page two debt',
      id: 'debt_page_two',
    });

    server.use(
      http.get(`${getBackendUrl()}/customers/:customerId/debts`, ({ request }) => {
        const page = new URL(request.url).searchParams.get('page');

        return HttpResponse.json({
          items: [page === '2' ? secondPageDebt : firstPageDebt],
          page: page === '2' ? 2 : 1,
          pageSize: 5,
          totalItems: 6,
          totalPages: 2,
        } satisfies DebtListResponse);
      }),
    );

    renderCustomerDebtRoute([
      `/customers/${baseCustomer.id}?debtPage=1&view=summary`,
    ]);

    expect(await screen.findByText('Page one debt')).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: debtMessages.list.pagination.nextPage }),
    );

    expect(await screen.findByText('Page two debt')).toBeInTheDocument();
    expect(screen.getByTestId('router-location')).toHaveTextContent(
      `/customers/${baseCustomer.id}?debtPage=2&view=summary`,
    );
  });

  it('canonicalizes an invalid debtPage URL to page one', async () => {
    const firstPageDebt = createDebtFixture(baseCustomer.id, {
      description: 'Page one debt',
      id: 'debt_page_one',
    });

    server.use(
      http.get(`${getBackendUrl()}/customers/:customerId/debts`, ({ request }) => {
        expect(new URL(request.url).searchParams.get('page')).toBe('1');

        return HttpResponse.json({
          items: [firstPageDebt],
          page: 1,
          pageSize: 5,
          totalItems: 1,
          totalPages: 1,
        } satisfies DebtListResponse);
      }),
    );

    renderCustomerDebtRoute([
      `/customers/${baseCustomer.id}?debtPage=invalid`,
    ]);

    expect(await screen.findByText('Page one debt')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByTestId('router-location')).toHaveTextContent(
        `/customers/${baseCustomer.id}?debtPage=1`,
      ),
    );
  });

  it('corrects a valid out-of-range debtPage to the last available page', async () => {
    const requestedPages: string[] = [];
    const lastPageDebt = createDebtFixture(baseCustomer.id, {
      description: 'Last page debt',
      id: 'debt_last_page',
    });
    let resolveLastPageRequest!: () => void;
    const pendingLastPageRequest = new Promise<void>((resolve) => {
      resolveLastPageRequest = resolve;
    });

    server.use(
      http.get(`${getBackendUrl()}/customers/:customerId/debts`, async ({ request }) => {
        const page = new URL(request.url).searchParams.get('page') ?? '';
        requestedPages.push(page);

        if (page === '99') {
          return HttpResponse.json({
            items: [],
            page: 99,
            pageSize: 5,
            totalItems: 6,
            totalPages: 2,
          } satisfies DebtListResponse);
        }

        await pendingLastPageRequest;

        return HttpResponse.json({
          items: [lastPageDebt],
          page: 2,
          pageSize: 5,
          totalItems: 6,
          totalPages: 2,
        } satisfies DebtListResponse);
      }),
    );

    renderCustomerDebtRoute([`/customers/${baseCustomer.id}?debtPage=99`]);

    await waitFor(() => expect(requestedPages).toEqual(['99', '2']));

    try {
      const debtRegion = screen.getByRole('region', { name: debtMessages.section.title });

      expect(debtRegion).toHaveAttribute('aria-busy', 'true');
      expect(
        within(debtRegion).getAllByTestId('debt-card-skeleton'),
      ).toHaveLength(5);
      expect(within(debtRegion).queryByText(debtMessages.section.empty)).not.toBeInTheDocument();
    } finally {
      resolveLastPageRequest();
    }

    expect(await screen.findByText('Last page debt')).toBeInTheDocument();
    expect(screen.getByTestId('router-location')).toHaveTextContent(
      `/customers/${baseCustomer.id}?debtPage=2`,
    );
  });

  it('restores the previous debt page through browser back navigation', async () => {
    const user = userEvent.setup();
    const firstPageDebt = createDebtFixture(baseCustomer.id, {
      description: 'Page one debt',
      id: 'debt_page_one',
    });
    const secondPageDebt = createDebtFixture(baseCustomer.id, {
      description: 'Page two debt',
      id: 'debt_page_two',
    });

    server.use(
      http.get(`${getBackendUrl()}/customers/:customerId/debts`, ({ request }) => {
        const page = new URL(request.url).searchParams.get('page');

        return HttpResponse.json({
          items: [page === '2' ? secondPageDebt : firstPageDebt],
          page: page === '2' ? 2 : 1,
          pageSize: 5,
          totalItems: 6,
          totalPages: 2,
        } satisfies DebtListResponse);
      }),
    );

    renderCustomerDebtRoute([`/customers/${baseCustomer.id}?debtPage=1`]);

    expect(await screen.findByText('Page one debt')).toBeInTheDocument();
    await user.click(
      screen.getByRole('button', { name: debtMessages.list.pagination.nextPage }),
    );
    expect(await screen.findByText('Page two debt')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Go back' }));

    expect(await screen.findByText('Page one debt')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByTestId('router-location')).toHaveTextContent(
        `/customers/${baseCustomer.id}?debtPage=1`,
      ),
    );
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

