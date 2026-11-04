import '@testing-library/jest-dom/vitest';
import { cleanup, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { getBackendUrl } from '../../../shared/api/http';
import { server } from '../../../shared/test/server';
import {
  createDebtFixture,
  emptyDebtList,
} from '../../debts/__tests__/debtTestData';
import {
  baseCustomer,
  customerList,
  emptyCustomerList,
  resetCustomerTestEnvironment,
} from './customerTestData';
import { renderCustomerRoutes } from './renderCustomerRoutes';

describe('CustomerDetailsPage debt actions', () => {
  beforeEach(() => {
    resetCustomerTestEnvironment();
    server.use(
      http.get(`${getBackendUrl()}/customers`, () =>
        HttpResponse.json(emptyCustomerList),
      ),
      http.get(`${getBackendUrl()}/customers/:customerId/debts`, () =>
        HttpResponse.json(emptyDebtList),
      ),
    );
  });

  afterEach(() => {
    cleanup();
  });

  it('opens Add debt from either customer action and restores focus to the trigger', async () => {
    const user = userEvent.setup();

    server.use(
      http.get(`${getBackendUrl()}/customers/:customerId`, () =>
        HttpResponse.json(baseCustomer),
      ),
    );

    renderCustomerRoutes([`/customers/${baseCustomer.id}`]);

    const headerAddDebtButton = (await screen.findAllByRole('button', {
      name: 'Add debt',
    }))[0]!;
    const debtSection = await screen.findByRole('region', { name: 'Debts' });
    const ledgerAddDebtButton = within(debtSection).getByRole('button', {
      name: 'Add debt',
    });

    await user.click(headerAddDebtButton);
    expect(await screen.findByRole('dialog', { name: 'Add debt' })).toBeInTheDocument();
    await user.keyboard('{Escape}');
    await waitFor(() => expect(headerAddDebtButton).toHaveFocus());

    await user.click(ledgerAddDebtButton);
    expect(await screen.findByRole('dialog', { name: 'Add debt' })).toBeInTheDocument();
    await user.keyboard('{Escape}');
    await waitFor(() => expect(ledgerAddDebtButton).toHaveFocus());
  });

  it('deletes the confirmed debt and refreshes customer views', async () => {
    const user = userEvent.setup();
    const initialDebt = createDebtFixture(baseCustomer.id, {
      description: 'Website redesign',
      totalAmount: '125.50',
      currency: 'USD',
    });
    const initialCustomer = {
      ...baseCustomer,
      financialSummary: [
        {
          currency: 'USD' as const,
          totalDebtAmount: '125.50',
          totalPaidAmount: '0.00',
          remainingAmount: '125.50',
        },
      ],
    };
    const updatedCustomer = {
      ...baseCustomer,
      financialSummary: [],
    };
    const initialDirectoryCustomer = customerList.items[0]!;
    const updatedDirectoryCustomer = {
      ...initialDirectoryCustomer,
      financialSummary: {
        balancesByCurrency: [],
      },
    };
    let isDeleted = false;
    let deleteRequestCount = 0;

    server.use(
      http.get(`${getBackendUrl()}/customers`, () =>
        HttpResponse.json({
          ...customerList,
          items: [isDeleted ? updatedDirectoryCustomer : initialDirectoryCustomer],
        }),
      ),
      http.get(`${getBackendUrl()}/customers/:customerId`, () =>
        HttpResponse.json(isDeleted ? updatedCustomer : initialCustomer),
      ),
      http.get(`${getBackendUrl()}/customers/:customerId/debts`, () =>
        HttpResponse.json(
          isDeleted
            ? emptyDebtList
            : {
                ...emptyDebtList,
                items: [initialDebt],
                totalItems: 1,
                totalPages: 1,
              },
        ),
      ),
      http.delete(
        `${getBackendUrl()}/customers/:customerId/debts/:debtId`,
        () => {
          deleteRequestCount += 1;
          isDeleted = true;
          return new HttpResponse(null, { status: 204 });
        },
      ),
    );

    renderCustomerRoutes(['/customers', `/customers/${baseCustomer.id}`], {
      defaultCurrency: 'USD',
    });

    await screen.findByRole('heading', { name: initialDebt.description });
    const { actionsMenu } = await openDebtActionMenu(user, initialDebt.description);
    await user.click(
      within(actionsMenu).getByRole('menuitem', { name: 'Delete debt' }),
    );
    const dialog = await screen.findByRole('dialog', { name: 'Delete debt' });

    await user.click(
      within(dialog).getByRole('button', { name: 'Delete debt' }),
    );

    expect(deleteRequestCount).toBe(1);
    expect(
      await screen.findByRole('status', { name: 'Debt deleted' }),
    ).toHaveTextContent('Website redesign was deleted.');
    await waitFor(() =>
      expect(
        screen.queryByRole('heading', { name: initialDebt.description }),
      ).not.toBeInTheDocument(),
    );
    expect(
      await screen.findByRole('region', { name: 'Financial summary' }),
    ).toHaveTextContent('No financial activity');

    await user.click(screen.getByRole('button', { name: 'Go back' }));
    expect(
      await screen.findByRole('cell', { name: baseCustomer.name }),
    ).toBeInTheDocument();
    expect(await screen.findByRole('cell', { name: 'No debt' })).toBeInTheDocument();
  });

  it('saves an edited debt and refreshes affected views', async () => {
    const user = userEvent.setup();
    const initialDebt = createDebtFixture(baseCustomer.id, {
      description: 'Website redesign',
      totalAmount: '125.50',
      currency: 'USD',
      scheduleItems: [
        {
          id: 'schedule_123',
          position: 1,
          amount: '125.50',
          dueDate: '2026-09-30',
          timing: 'upcoming',
        },
      ],
    });
    const updatedDebt = createDebtFixture(baseCustomer.id, {
      description: 'Updated website redesign',
      totalAmount: '275.70',
      currency: 'EUR',
      updatedAt: '2026-09-20T12:00:00.000Z',
      scheduleItems: [
        {
          id: 'schedule_123',
          position: 1,
          amount: '275.70',
          dueDate: '2026-10-15',
          timing: 'upcoming',
        },
      ],
    });
    const initialCustomer = {
      ...baseCustomer,
      financialSummary: [
        {
          currency: 'USD' as const,
          totalDebtAmount: '125.50',
          totalPaidAmount: '0.00',
          remainingAmount: '125.50',
        },
      ],
    };
    const updatedCustomer = {
      ...baseCustomer,
      financialSummary: [
        {
          currency: 'EUR' as const,
          totalDebtAmount: '275.70',
          totalPaidAmount: '0.00',
          remainingAmount: '275.70',
        },
      ],
    };
    const updatedDirectoryCustomer = {
      ...customerList.items[0],
      financialSummary: {
        balancesByCurrency: [
          {
            currency: 'EUR' as const,
            remainingAmount: '275.70',
            overdueAmount: '0.00',
          },
        ],
      },
    };
    let isReplaced = false;

    server.use(
      http.get(`${getBackendUrl()}/customers`, () =>
        HttpResponse.json({
          ...emptyCustomerList,
          items: [updatedDirectoryCustomer],
          totalItems: 1,
          totalPages: 1,
        }),
      ),
      http.get(`${getBackendUrl()}/customers/:customerId`, () =>
        HttpResponse.json(isReplaced ? updatedCustomer : initialCustomer),
      ),
      http.get(`${getBackendUrl()}/customers/:customerId/debts`, () =>
        HttpResponse.json({
          ...emptyDebtList,
          items: [isReplaced ? updatedDebt : initialDebt],
          totalItems: 1,
          totalPages: 1,
        }),
      ),
      http.put(
        `${getBackendUrl()}/customers/:customerId/debts/:debtId`,
        () => {
          isReplaced = true;

          return HttpResponse.json(updatedDebt);
        },
      ),
    );

    renderCustomerRoutes(['/customers', `/customers/${baseCustomer.id}`], {
      defaultCurrency: 'USD',
    });

    await screen.findByRole('heading', { name: initialDebt.description });
    const debtCard = getDebtCard(initialDebt.description);

    await user.click(
      within(debtCard).getByRole('button', {
        name: `Open actions for ${initialDebt.description}`,
      }),
    );
    const actionsMenu = await screen.findByRole('menu', {
      name: `Actions for ${initialDebt.description}`,
    });
    await user.click(
      within(actionsMenu).getByRole('menuitem', { name: 'Edit debt' }),
    );
    const drawer = await screen.findByRole('dialog', { name: 'Edit debt' });
    const descriptionInput = within(drawer).getByLabelText('Description');
    const amountInput = within(drawer).getByLabelText('Total amount');
    const currencySelect = within(drawer).getByLabelText('Currency');
    const dueDateInput = within(drawer).getByLabelText('Due date');

    await user.clear(descriptionInput);
    await user.type(descriptionInput, updatedDebt.description);
    await user.clear(amountInput);
    await user.type(amountInput, '275.7');
    await user.selectOptions(currencySelect, 'EUR');
    await user.clear(dueDateInput);
    await user.type(dueDateInput, '2026-10-15');
    await user.click(within(drawer).getByRole('button', { name: 'Save debt' }));

    expect(
      await screen.findByRole('status', { name: 'Debt updated' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'Edit debt' })).not.toBeInTheDocument();
    await screen.findByRole('heading', { name: updatedDebt.description });
    const updatedDebtCard = getDebtCard(updatedDebt.description);

    expect(updatedDebtCard).toHaveTextContent('€275.70');
    expect(within(updatedDebtCard).getByRole('time')).toHaveAttribute(
      'datetime',
      '2026-10-15',
    );

    const summary = await screen.findByRole('region', {
      name: 'Financial summary',
    });
    expect(summary).toHaveTextContent('€275.70');

    await user.click(screen.getByRole('button', { name: 'Go back' }));
    expect(
      await screen.findByRole('cell', { name: baseCustomer.name }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('cell', { name: '275.70 EUR' }),
    ).toBeInTheDocument();
  });
});

async function openDebtActionMenu(
  user: ReturnType<typeof userEvent.setup>,
  description: string,
): Promise<{ actionsMenu: HTMLElement; actionsTrigger: HTMLElement }> {
  const debtCard = getDebtCard(description);
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

function getDebtCard(description: string): HTMLElement {
  const debtCard = screen
    .getByRole('heading', { name: description })
    .closest('article');

  if (!debtCard) {
    throw new Error('Expected the debt heading to belong to a debt card.');
  }

  return debtCard;
}
