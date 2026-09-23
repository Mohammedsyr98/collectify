import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { useNavigate } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { DebtListResponse, DebtResponse, SessionResponse } from '@collectify/contracts';

import App from '../../../App';
import { getBackendUrl } from '../../../shared/api/http';
import { localeStorageKey } from '../../../shared/localization';
import { renderWithAppProviders } from '../../../shared/test/render';
import { server } from '../../../shared/test/server';
import { baseCustomer, resetCustomerTestEnvironment } from '../../customers/__tests__/customerTestData';
import { RouterLocationProbe } from '../../customers/__tests__/RouterLocationProbe';
import { CustomerDebtLedger } from '../CustomerDebtLedger';
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

const createdDebt = createDebtFixture('customer_123');

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

  // List presentation and local debt controls
  it('renders the empty debt state', async () => {
    renderLedger([]);

    expect(await screen.findByText('No debts yet.')).toBeInTheDocument();
  });

  it('renders a complete one-payment debt card', async () => {
    renderLedger([createdDebt]);

    const debtCard = await getDebtCard('Website redesign');

    expect(within(debtCard).getAllByText('$125.50')).toHaveLength(2);
    expect(within(debtCard).getByText('One payment')).toBeInTheDocument();
    expect(within(debtCard).getByText('Upcoming')).toBeInTheDocument();
    expect(within(debtCard).getByText('Paid')).toBeInTheDocument();
    expect(within(debtCard).getByText('$0.00')).toBeInTheDocument();
    expect(within(debtCard).getByText('Remaining')).toBeInTheDocument();
    expect(within(debtCard).getByText('Due')).toBeInTheDocument();
    expect(within(debtCard).getByText('September 30, 2026')).toBeInTheDocument();
    expect(
      within(debtCard).getByRole('progressbar', {
        name: 'Payment progress for Website redesign',
      }),
    ).toHaveAttribute('aria-valuenow', '0');
    expect(within(debtCard).queryByText('Due today')).not.toBeInTheDocument();
    expect(within(debtCard).queryByText('Overdue')).not.toBeInTheDocument();
  });

  it('opens the debt actions menu with Enter', async () => {
    const user = userEvent.setup();

    renderLedger([createdDebt]);

    const debtCard = await getDebtCard('Website redesign');
    const actionsTrigger = within(debtCard).getByRole('button', {
      name: 'Open actions for Website redesign',
    });

    actionsTrigger.focus();
    await user.keyboard('{Enter}');

    const actionsMenu = await screen.findByRole('menu', {
      name: 'Actions for Website redesign',
    });

    expect(
      within(actionsMenu).getByRole('menuitem', { name: 'Edit debt' }),
    ).toBeInTheDocument();
  });

  it('shows only the applicable timing label on each debt', async () => {
    const dueTodayDebt: DebtResponse = {
      ...createdDebt,
      id: 'debt_due_today',
      description: 'Office supplies',
      scheduleItems: [
        {
          ...createdDebt.scheduleItems[0],
          id: 'schedule_due_today',
          timing: 'dueToday',
        },
      ],
    };
    const overdueDebt: DebtResponse = {
      ...createdDebt,
      id: 'debt_overdue',
      description: 'Storefront repair',
      scheduleItems: [
        {
          ...createdDebt.scheduleItems[0],
          id: 'schedule_overdue',
          timing: 'overdue',
        },
      ],
    };

    renderLedger([dueTodayDebt, overdueDebt]);

    const dueTodayCard = await getDebtCard('Office supplies');
    const overdueCard = await getDebtCard('Storefront repair');

    expect(within(dueTodayCard).getByText('Due today')).toBeInTheDocument();
    expect(within(dueTodayCard).queryByText('Overdue')).not.toBeInTheDocument();
    expect(within(dueTodayCard).queryByText('Upcoming')).not.toBeInTheDocument();
    expect(within(overdueCard).getByText('Overdue')).toBeInTheDocument();
    expect(within(overdueCard).queryByText('Due today')).not.toBeInTheDocument();
    expect(within(overdueCard).queryByText('Upcoming')).not.toBeInTheDocument();
  });

  it('localizes Arabic debt details and isolates the money amount', async () => {
    window.localStorage.setItem(localeStorageKey, 'ar');
    const overdueDebt: DebtResponse = {
      ...createdDebt,
      scheduleItems: [
        {
          ...createdDebt.scheduleItems[0],
          id: 'schedule_overdue_ar',
          timing: 'overdue',
        },
      ],
    };

    renderLedger([overdueDebt]);

    const debtCard = await getDebtCard('Website redesign');
    const localizedAmount = new Intl.NumberFormat('ar', {
      currency: 'USD',
      currencyDisplay: 'symbol',
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
      style: 'currency',
    }).format(125.5);
    const localizedDueDate = new Intl.DateTimeFormat('ar', {
      dateStyle: 'long',
      timeZone: 'UTC',
    }).format(new Date('2026-09-30T00:00:00.000Z'));

    expect(within(debtCard).getByText('دفعة واحدة')).toBeInTheDocument();
    expect(within(debtCard).getByText(localizedDueDate)).toBeInTheDocument();
    expect(within(debtCard).getByText('متأخر')).toBeInTheDocument();

    expect(within(debtCard).getByText('المدفوع')).toBeInTheDocument();
    expect(within(debtCard).getByText('المتبقي')).toBeInTheDocument();

    const isolatedAmount = debtCard.querySelector('bdi[dir="ltr"]');

    expect(isolatedAmount?.textContent).toBe(localizedAmount);
    expect(isolatedAmount).toHaveAttribute('dir', 'ltr');
  });

  it('localizes the payment plan and timing label in Turkish', async () => {
    window.localStorage.setItem(localeStorageKey, 'tr');
    const dueTodayDebt: DebtResponse = {
      ...createdDebt,
      scheduleItems: [
        {
          ...createdDebt.scheduleItems[0],
          id: 'schedule_due_today_tr',
          timing: 'dueToday',
        },
      ],
    };

    renderLedger([dueTodayDebt]);

    const debtCard = await getDebtCard('Website redesign');

    expect(within(debtCard).getByText('Tek ödeme')).toBeInTheDocument();
    expect(within(debtCard).getByText('Vadesi bugün')).toBeInTheDocument();
  });
  it('opens the add-debt drawer from the ledger section', async () => {
    const user = userEvent.setup();

    renderLedger([]);

    const debtSection = await screen.findByRole('region', { name: 'Debts' });
    await user.click(within(debtSection).getByRole('button', { name: 'Add debt' }));

    expect(await screen.findByRole('dialog', { name: 'Add debt' })).toBeInTheDocument();
  });

  it('returns focus to the Add debt trigger after closing the drawer', async () => {
    const user = userEvent.setup();

    renderLedger([]);

    const addDebtButton = await screen.findByRole('button', { name: 'Add debt' });
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
      expect(
        screen.queryByRole('dialog', { name: 'Edit debt' }),
      ).not.toBeInTheDocument(),
    );
    expect(actionsTrigger).toHaveFocus();
  });

  it('opens the selected debt deletion confirmation and cancels without deleting', async () => {
    const user = userEvent.setup();
    const debt = createDebtFixture(baseCustomer.id, {
      description: 'Website redesign',
      totalAmount: '275.75',
      currency: 'EUR',
    });
    let deleteRequestCount = 0;

    server.use(
      http.delete(
        `${getBackendUrl()}/customers/:customerId/debts/:debtId`,
        () => {
          deleteRequestCount += 1;
          return new HttpResponse(null, { status: 204 });
        },
      ),
    );

    renderLedger([debt]);

    const { actionsMenu, actionsTrigger } = await openDebtActionMenu(
      user,
      debt.description,
    );
    await user.click(
      within(actionsMenu).getByRole('menuitem', { name: 'Delete debt' }),
    );

    const dialog = await screen.findByRole('dialog', { name: 'Delete debt' });
    expect(dialog).toHaveTextContent(debt.description);
    expect(dialog).toHaveTextContent('€275.75');
    expect(dialog).toHaveTextContent('This action cannot be undone.');

    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));

    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: 'Delete debt' }),
      ).not.toBeInTheDocument(),
    );
    expect(deleteRequestCount).toBe(0);
    expect(actionsTrigger).toHaveFocus();
  });

  it('keeps the edited debt draft after an unexpected replacement failure', async () => {
    const user = userEvent.setup();

    server.use(
      http.put(
        `${getBackendUrl()}/customers/:customerId/debts/:debtId`,
        () => HttpResponse.text('Internal server error', { status: 500 }),
      ),
    );

    const { drawer } = await openSelectedDebtEditor(user);
    const descriptionInput = within(drawer).getByLabelText('Description');
    await user.clear(descriptionInput);
    await user.type(descriptionInput, 'Updated website redesign');
    await user.click(within(drawer).getByRole('button', { name: 'Save debt' }));

    expect(
      await screen.findByRole('alert', { name: 'Could not update debt' }),
    ).toHaveTextContent('Something went wrong. Try again.');
    expect(screen.getByRole('dialog', { name: 'Edit debt' })).toBeInTheDocument();
    expect(descriptionInput).toHaveValue('Updated website redesign');
  });

  // Debt creation
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

  // Debt query and URL state
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

    renderWithAppProviders(
      <>
        <App />
        <RouterLocationProbe />
      </>,
      {
        initialEntries: [
          `/customers/${baseCustomer.id}?debtPage=2&debtSearch=redesign&view=summary`,
        ],
      },
    );

    expect(await screen.findByText('Website redesign')).toBeInTheDocument();
    expect(requestedQueries).toEqual([{ page: '2', search: 'redesign' }]);

    vi.useFakeTimers();
    const searchInput = screen.getByRole('searchbox', { name: 'Search debts' });
    fireEvent.change(searchInput, { target: { value: '' } });

    expect(searchInput).toHaveValue('');
    expect(requestedQueries).toEqual([{ page: '2', search: 'redesign' }]);

    await act(async () => {
      vi.advanceTimersByTime(500);
    });
    vi.useRealTimers();

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

    renderWithAppProviders(
      <>
        <App />
        <RouterLocationProbe />
      </>,
      {
        initialEntries: [
          `/customers/${baseCustomer.id}?debtPage=1&debtSearch=redesign&view=summary`,
        ],
      },
    );

    expect(await screen.findByText('First redesign debt')).toBeInTheDocument();
    expect(requestedQueries).toEqual([{ page: '1', search: 'redesign' }]);

    await user.click(screen.getByRole('button', { name: 'Next page' }));

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

  // Debt creation failure states
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

function renderLedger(debts: DebtResponse[]) {
  server.use(
    http.get(`${getBackendUrl()}/customers/:customerId/debts`, () =>
      HttpResponse.json({
        items: debts,
        page: 1,
        pageSize: 5,
        totalItems: debts.length,
        totalPages: 1,
      }),
    ),
  );

  return renderWithAppProviders(
    <CustomerDebtLedger customerId={baseCustomer.id} defaultCurrency="USD" />,
    { initialEntries: [`/customers/${baseCustomer.id}`] },
  );
}

async function getDebtCard(description: string): Promise<HTMLElement> {
  const debtCard = (await screen.findByRole('heading', { name: description })).closest('article');

  if (!debtCard) {
    throw new Error('Expected the debt description to belong to a debt card.');
  }

  return debtCard;
}

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

  renderLedger([debt]);

  const { actionsMenu, actionsTrigger } = await openDebtActionMenu(
    user,
    debt.description,
  );
  await user.click(
    within(actionsMenu).getByRole('menuitem', { name: 'Edit debt' }),
  );

  return {
    actionsTrigger,
    drawer: await screen.findByRole('dialog', { name: 'Edit debt' }),
  };
}

async function openDebtActionMenu(
  user: ReturnType<typeof userEvent.setup>,
  description: string,
): Promise<{ actionsMenu: HTMLElement; actionsTrigger: HTMLElement }> {
  const debtCard = await getDebtCard(description);
  const actionsTrigger = within(debtCard).getByRole('button', {
    name: `Open actions for ${description}`,
  });

  await user.click(actionsTrigger);

  return {
    actionsMenu: await screen.findByRole('menu', {
      name: `Actions for ${description}`,
    }),
    actionsTrigger,
  };
}

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
