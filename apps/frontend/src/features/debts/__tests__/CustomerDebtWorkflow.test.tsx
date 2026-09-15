import '@testing-library/jest-dom/vitest';
import { cleanup, screen, within } from '@testing-library/react';
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
