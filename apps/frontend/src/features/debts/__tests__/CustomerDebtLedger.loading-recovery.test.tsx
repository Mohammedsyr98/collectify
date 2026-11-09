import '@testing-library/jest-dom/vitest';
import { cleanup, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { useNavigate } from 'react-router';
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
import { RouterLocationProbe } from '@/shared/test';
import { customerResources } from '../../customers/localization/resources';
import { appShellResources } from '../../../app/localization/appShellResources';
import { sharedLocalizationResources } from '../../../shared/localization/resources';
import { debtResources } from '../localization/resources';
import {
  createDebtFixture,
  emptyDebtList,
} from './debtTestData';

const customerMessages = customerResources.en.common.customers;
const appMessages = appShellResources.en.common.app;
const sharedMessages = sharedLocalizationResources.en.common;
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


  describe('customer-route loading and recovery', () => {
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

    renderCustomerDebtRoute([`/customers/${baseCustomer.id}`]);

    try {
      expect(
        await screen.findByRole('heading', { name: baseCustomer.name }),
      ).toBeInTheDocument();

      const debtRegion = screen.getByRole('region', { name: debtMessages.section.title });

      expect(debtRegion).toHaveAttribute('aria-busy', 'true');
      expect(
        within(debtRegion).getAllByTestId('debt-card-skeleton'),
      ).toHaveLength(5);
      expect(screen.getByRole('status')).toHaveTextContent(debtMessages.list.loading);
      expect(
        screen.getByRole('region', { name: customerMessages.details.payments }),
      ).toBeInTheDocument();
      expect(within(debtRegion).queryByText(debtMessages.section.empty)).not.toBeInTheDocument();
    } finally {
      resolveDebtRequest();
    }
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

    renderCustomerDebtRoute([
      `/customers/${baseCustomer.id}?debtPage=2&view=summary`,
    ]);

    try {
      const errorState = await screen.findByRole('alert', {
        name: debtMessages.list.error.title,
      });

      expect(errorState).toHaveTextContent(sharedMessages.errors.genericDescription);
      expect(screen.getByRole('heading', { name: baseCustomer.name })).toBeInTheDocument();
      expect(screen.getByRole('region', { name: customerMessages.details.payments })).toBeInTheDocument();
      expect(screen.getByTestId('router-location')).toHaveTextContent(
        `/customers/${baseCustomer.id}?debtPage=2&view=summary`,
      );

      await user.click(within(errorState).getByRole('button', { name: appMessages.error.retry }));

      await waitFor(() => {
        expect(debtListRequestCount).toBe(2);
        const currentErrorState = screen.getByRole('alert', {
          name: debtMessages.list.error.title,
        });

        expect(
          within(currentErrorState).getByRole('button', { name: appMessages.error.retry }),
        ).toBeDisabled();
        expect(screen.getByRole('region', { name: debtMessages.section.title })).toHaveAttribute(
          'aria-busy',
          'true',
        );
      });
    } finally {
      resolveRetryRequest();
    }

    expect(await screen.findByText('Recovered debt')).toBeInTheDocument();
    expect(
      screen.queryByRole('alert', { name: debtMessages.list.error.title }),
    ).not.toBeInTheDocument();
    expect(debtListRequestCount).toBe(2);
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
      const debtRegion = screen.getByRole('region', { name: debtMessages.section.title });

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

