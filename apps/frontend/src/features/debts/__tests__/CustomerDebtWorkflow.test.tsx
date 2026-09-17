import '@testing-library/jest-dom/vitest';
import { cleanup, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

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

    server.use(
      http.get(`${getBackendUrl()}/customers/:customerId/debts`, ({ request }) => {
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
