import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { useNavigate } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { DebtListResponse, SessionResponse } from '@collectify/contracts';

import App from '../../../App';
import { getBackendUrl } from '../../../shared/api/http';
import { renderWithAppProviders } from '../../../shared/test/render';
import { server } from '../../../shared/test/server';
import {
  baseCustomer,
  resetCustomerTestEnvironment,
} from '../../customers/__tests__/customerTestData';
import { RouterLocationProbe } from '../../customers/__tests__/RouterLocationProbe';
import { createDebtFixture, emptyDebtList } from './debtTestData';

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

const createdDebt = createDebtFixture(baseCustomer.id);

describe('Customer debt workflow', () => {
  beforeEach(() => {
    resetCustomerTestEnvironment();
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

  it('creates a debt from customer details and keeps it after a route remount', async () => {
    const user = userEvent.setup();
    let debtList: DebtListResponse = emptyDebtList;

    server.use(
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

        return HttpResponse.json(createdDebt, { status: 201 });
      }),
    );

    const firstRender = renderDebtWorkflow();
    const drawer = await openAndFillDebtDrawer(user);

    await user.click(within(drawer).getByRole('button', { name: 'Save debt' }));

    expect(await screen.findByText('Website redesign')).toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'Debt created' })).toBeInTheDocument();

    firstRender.unmount();
    renderDebtWorkflow();

    expect(await screen.findByText('Website redesign')).toBeInTheDocument();
  }, 10_000);

  it('shows debt loading state without replacing customer details while the initial list loads', async () => {
    let resolveDebtRequest!: () => void;
    const pendingDebtRequest = new Promise<void>((resolve) => {
      resolveDebtRequest = resolve;
    });

    server.use(
      http.get(`${getBackendUrl()}/customers/:customerId/debts`, async () => {
        await pendingDebtRequest;

        return HttpResponse.json(emptyDebtList);
      }),
    );

    renderDebtWorkflow();

    try {
      expect(
        await screen.findByRole('heading', { name: baseCustomer.name }),
      ).toBeInTheDocument();

      const debtRegion = screen.getByRole('region', { name: 'Debts' });

      expect(debtRegion).toHaveAttribute('aria-busy', 'true');
      expect(
        within(debtRegion).getAllByTestId('debt-card-skeleton'),
      ).toHaveLength(5);
      expect(screen.getByRole('status')).toHaveTextContent('Loading debts');
      expect(
        screen.getByRole('region', { name: 'Payments' }),
      ).toBeInTheDocument();
      expect(within(debtRegion).queryByText('No debts yet.')).not.toBeInTheDocument();
    } finally {
      resolveDebtRequest();
    }
  });

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

    renderWithAppProviders(
      <>
        <App />
        <RouterLocationProbe />
      </>,
      {
        initialEntries: [
          `/customers/${baseCustomer.id}?debtPage=2&view=summary`,
        ],
      },
    );

    expect(await screen.findByText('Initial debt')).toBeInTheDocument();
    expect(requestedQueries).toEqual([{ page: '2', search: null }]);

    vi.useFakeTimers();
    const searchInput = screen.getByRole('searchbox', { name: 'Search debts' });
    fireEvent.change(searchInput, { target: { value: 'redesign' } });

    expect(searchInput).toHaveValue('redesign');
    expect(requestedQueries).toEqual([{ page: '2', search: null }]);

    await act(async () => {
      vi.advanceTimersByTime(499);
    });
    expect(requestedQueries).toEqual([{ page: '2', search: null }]);

    await act(async () => {
      vi.advanceTimersByTime(1);
    });
    vi.useRealTimers();

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

  it('recovers a failed debt page through a section-local retry', async () => {
    const user = userEvent.setup();
    const recoveredDebt = createDebtFixture(baseCustomer.id, {
      description: 'Recovered debt',
      id: 'debt_recovered',
    });
    let debtListRequestCount = 0;
    let resolveRetryRequest!: () => void;
    const pendingRetryRequest = new Promise<void>((resolve) => {
      resolveRetryRequest = resolve;
    });

    server.use(
      http.get(`${getBackendUrl()}/customers/:customerId/debts`, async () => {
        debtListRequestCount += 1;

        if (debtListRequestCount === 1) {
          return HttpResponse.text('Internal server error', { status: 500 });
        }

        await pendingRetryRequest;

        return HttpResponse.json({
          items: [recoveredDebt],
          page: 2,
          pageSize: 5,
          totalItems: 6,
          totalPages: 2,
        } satisfies DebtListResponse);
      }),
    );

    renderWithAppProviders(
      <>
        <App />
        <RouterLocationProbe />
      </>,
      {
        initialEntries: [
          `/customers/${baseCustomer.id}?debtPage=2&view=summary`,
        ],
      },
    );

    try {
      const errorState = await screen.findByRole('alert', {
        name: 'Could not load debts',
      });

      expect(errorState).toHaveTextContent('Something went wrong. Try again.');
      expect(screen.getByRole('heading', { name: baseCustomer.name })).toBeInTheDocument();
      expect(screen.getByRole('region', { name: 'Payments' })).toBeInTheDocument();
      expect(screen.getByTestId('router-location')).toHaveTextContent(
        `/customers/${baseCustomer.id}?debtPage=2&view=summary`,
      );

      await user.click(within(errorState).getByRole('button', { name: 'Try again' }));

      await waitFor(() => {
        expect(debtListRequestCount).toBe(2);
        const currentErrorState = screen.getByRole('alert', {
          name: 'Could not load debts',
        });

        expect(
          within(currentErrorState).getByRole('button', { name: 'Try again' }),
        ).toBeDisabled();
        expect(screen.getByRole('region', { name: 'Debts' })).toHaveAttribute(
          'aria-busy',
          'true',
        );
      });
    } finally {
      resolveRetryRequest();
    }

    expect(await screen.findByText('Recovered debt')).toBeInTheDocument();
    expect(
      screen.queryByRole('alert', { name: 'Could not load debts' }),
    ).not.toBeInTheDocument();
    expect(debtListRequestCount).toBe(2);
  });

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

    renderWithAppProviders(
      <>
        <App />
        <RouterLocationProbe />
      </>,
      {
        initialEntries: [`/customers/${baseCustomer.id}?debtPage=1`],
      },
    );

    expect(await screen.findByText('Page one debt')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Next page' }));
    await waitFor(() => expect(requestedPages).toEqual(['1', '2']));

    try {
      const debtRegion = screen.getByRole('region', { name: 'Debts' });

      expect(within(debtRegion).queryByText('Page one debt')).not.toBeInTheDocument();
      expect(
        within(debtRegion).getAllByTestId('debt-card-skeleton'),
      ).toHaveLength(5);

      const pagination = within(debtRegion).getByRole('navigation', {
        name: 'Debt pages',
      });

      expect(
        within(pagination).getByRole('button', { name: 'Previous page' }),
      ).toBeDisabled();
      expect(
        within(pagination).getByRole('button', { name: 'Next page' }),
      ).toBeDisabled();
      expect(
        screen.getByRole('heading', { name: baseCustomer.name }),
      ).toBeInTheDocument();
      expect(screen.getByRole('region', { name: 'Payments' })).toBeInTheDocument();
    } finally {
      resolveNextPageRequest();
    }

    expect(await screen.findByText('Page two debt')).toBeInTheDocument();
  });

  it('does not reuse another customer\'s debt placeholder while switching customers', async () => {
    const user = userEvent.setup();
    const secondCustomer = {
      ...baseCustomer,
      code: 'SECOND-002',
      id: 'customer_456',
      name: 'Second Customer',
    };
    const firstCustomerDebt = createDebtFixture(baseCustomer.id, {
      description: 'First customer debt',
      id: 'debt_first_customer',
    });
    const secondCustomerDebt = createDebtFixture(secondCustomer.id, {
      description: 'Second customer debt',
      id: 'debt_second_customer',
    });
    let resolveSecondCustomerDebtRequest!: () => void;
    const pendingSecondCustomerDebtRequest = new Promise<void>((resolve) => {
      resolveSecondCustomerDebtRequest = resolve;
    });

    server.use(
      http.get(`${getBackendUrl()}/customers/:customerId`, ({ params }) =>
        HttpResponse.json(
          params.customerId === secondCustomer.id ? secondCustomer : baseCustomer,
        ),
      ),
      http.get(`${getBackendUrl()}/customers/:customerId/debts`, async ({ params }) => {
        if (params.customerId === secondCustomer.id) {
          await pendingSecondCustomerDebtRequest;

          return HttpResponse.json({
            items: [secondCustomerDebt],
            page: 1,
            pageSize: 5,
            totalItems: 1,
            totalPages: 1,
          } satisfies DebtListResponse);
        }

        return HttpResponse.json({
          items: [firstCustomerDebt],
          page: 1,
          pageSize: 5,
          totalItems: 1,
          totalPages: 1,
        } satisfies DebtListResponse);
      }),
    );

    renderWithAppProviders(
      <>
        <App />
        <CustomerRouteSwitcher customerId={secondCustomer.id} />
      </>,
      {
        initialEntries: [`/customers/${baseCustomer.id}`],
      },
    );

    expect(await screen.findByText('First customer debt')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Switch customer' }));

    try {
      expect(
        await screen.findByRole('heading', { name: secondCustomer.name }),
      ).toBeInTheDocument();
      const debtRegion = screen.getByRole('region', { name: 'Debts' });

      expect(within(debtRegion).queryByText('First customer debt')).not.toBeInTheDocument();
      expect(
        within(debtRegion).getAllByTestId('debt-card-skeleton'),
      ).toHaveLength(5);
    } finally {
      resolveSecondCustomerDebtRequest();
    }

    expect(await screen.findByText('Second customer debt')).toBeInTheDocument();
    expect(screen.queryByText('First customer debt')).not.toBeInTheDocument();
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

    renderWithAppProviders(<App />, {
      initialEntries: [`/customers/${baseCustomer.id}?debtPage=2`],
    });

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

    renderWithAppProviders(
      <>
        <App />
        <RouterLocationProbe />
      </>,
      {
        initialEntries: [`/customers/${baseCustomer.id}?debtPage=1`],
      },
    );

    expect(await screen.findByText('Page one debt')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Next page' }));

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

    renderWithAppProviders(
      <>
        <App />
        <RouterLocationProbe />
      </>,
      {
        initialEntries: [`/customers/${baseCustomer.id}?debtPage=1&view=summary`],
      },
    );

    expect(await screen.findByText('Page one debt')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Next page' }));

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

    renderWithAppProviders(
      <>
        <App />
        <RouterLocationProbe />
      </>,
      {
        initialEntries: [
          `/customers/${baseCustomer.id}?debtPage=invalid`,
        ],
      },
    );

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

    renderWithAppProviders(
      <>
        <App />
        <RouterLocationProbe />
      </>,
      {
        initialEntries: [`/customers/${baseCustomer.id}?debtPage=99`],
      },
    );

    await waitFor(() => expect(requestedPages).toEqual(['99', '2']));

    try {
      const debtRegion = screen.getByRole('region', { name: 'Debts' });

      expect(debtRegion).toHaveAttribute('aria-busy', 'true');
      expect(
        within(debtRegion).getAllByTestId('debt-card-skeleton'),
      ).toHaveLength(5);
      expect(within(debtRegion).queryByText('No debts yet.')).not.toBeInTheDocument();
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

    renderWithAppProviders(
      <>
        <App />
        <RouterLocationProbe />
      </>,
      {
        initialEntries: [`/customers/${baseCustomer.id}?debtPage=1`],
      },
    );

    expect(await screen.findByText('Page one debt')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Next page' }));
    expect(await screen.findByText('Page two debt')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Go back' }));

    expect(await screen.findByText('Page one debt')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByTestId('router-location')).toHaveTextContent(
        `/customers/${baseCustomer.id}?debtPage=1`,
      ),
    );
  });

  it('shows backend validation failure in a toast and preserves the draft', async () => {
    const user = userEvent.setup();

    server.use(
      http.post(`${getBackendUrl()}/customers/:customerId/debts`, () =>
        HttpResponse.json(
          {
            code: 'VALIDATION_ERROR',
            message: 'Check the highlighted fields.',
            fieldErrors: {
              paymentPlan: ['DEBT_DUE_DATE_INVALID'],
            },
          },
          { status: 400 },
        ),
      ),
    );

    renderDebtWorkflow();
    const drawer = await openAndFillDebtDrawer(user);

    await user.click(within(drawer).getByRole('button', { name: 'Save debt' }));

    expect(
      await screen.findByRole('alert', { name: 'Could not create debt' }),
    ).toHaveTextContent('Check the highlighted fields.');
    expect(screen.queryByText('Enter a valid due date.')).not.toBeInTheDocument();
    expect(within(drawer).getByLabelText('Due date')).toHaveValue('2026-09-30');
    expect(within(drawer).getByLabelText('Description')).toHaveValue(
      'Website redesign',
    );
    expect(drawer).toBeInTheDocument();
  });

  it('keeps the drawer and draft after an unexpected create failure', async () => {
    const user = userEvent.setup();

    server.use(
      http.post(`${getBackendUrl()}/customers/:customerId/debts`, () =>
        HttpResponse.text('Internal server error', { status: 500 }),
      ),
    );

    renderDebtWorkflow();
    const drawer = await openAndFillDebtDrawer(user);

    await user.click(within(drawer).getByRole('button', { name: 'Save debt' }));

    expect(
      await screen.findByRole('alert', { name: 'Could not create debt' }),
    ).toHaveTextContent('Something went wrong. Try again.');
    expect(drawer).toBeInTheDocument();
    expect(within(drawer).getByLabelText('Description')).toHaveValue(
      'Website redesign',
    );
  }, 10_000);
});

function renderDebtWorkflow() {
  return renderWithAppProviders(<App />, {
    initialEntries: [`/customers/${baseCustomer.id}`],
  });
}

function CustomerRouteSwitcher({ customerId }: { customerId: string }) {
  const navigate = useNavigate();

  return (
    <button
      aria-label="Switch customer"
      onClick={() => navigate(`/customers/${customerId}`)}
      type="button"
    />
  );
}

async function openAndFillDebtDrawer(
  user: ReturnType<typeof userEvent.setup>,
) {
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

  return drawer;
}
