import '@testing-library/jest-dom/vitest';
import { cleanup, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { DebtResponse } from '@collectify/contracts';

import { getBackendUrl } from '../../../shared/api/http';
import { localeStorageKey } from '../../../shared/localization';
import { renderWithAppProviders } from '../../../shared/test/render';
import { server } from '../../../shared/test/server';
import { baseCustomer, resetCustomerTestEnvironment } from '../../customers/__tests__/customerTestData';
import { CustomerDebtLedger } from '../CustomerDebtLedger';
import { createDebtFixture, emptyDebtList } from './debtTestData';

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
      http.get(`${getBackendUrl()}/customers/:customerId/debts`, () =>
        HttpResponse.json(emptyDebtList),
      ),
    );
  });

  afterEach(() => {
    cleanup();
  });

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
