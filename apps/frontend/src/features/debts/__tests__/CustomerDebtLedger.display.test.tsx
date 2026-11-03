import '@testing-library/jest-dom/vitest';
import { cleanup, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  debtApiErrorCode,
  type DebtResponse,
  type SessionResponse,
} from '@collectify/contracts';

import { getBackendUrl } from '../../../shared/api/http';
import { localeStorageKey } from '../../../shared/localization';
import { renderWithAppProviders } from '../../../shared/test/render';
import { server } from '../../../shared/test/server';
import { baseCustomer, resetCustomerTestEnvironment } from '../../customers/__tests__/customerTestData';
import { CustomerDebtLedger } from '../CustomerDebtLedger';
import { debtResources } from '../localization/resources';
import {
  createDebtFixture,
  createInstallmentDebtFixture,
  emptyDebtList,
} from './debtTestData';

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

  describe('direct ledger behavior', () => {
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
    expect(within(debtCard).queryByText('Due today')).not.toBeInTheDocument();
    expect(within(debtCard).queryByText('Overdue')).not.toBeInTheDocument();
  });

  it('renders an installment count and offers editing', async () => {
    const installmentDebt: DebtResponse = {
      ...createdDebt,
      description: 'Website redesign installments',
      paymentPlanType: 'installment',
      scheduleItems: [
        {
          id: 'schedule_installment_1',
          position: 1,
          amount: '60.00',
          dueDate: '2026-09-30',
          timing: 'upcoming',
        },
        {
          id: 'schedule_installment_2',
          position: 2,
          amount: '65.50',
          dueDate: '2026-10-30',
          timing: 'upcoming',
        },
      ],
    };

    const user = userEvent.setup();
    renderLedger([installmentDebt]);

    const debtCard = await getDebtCard('Website redesign installments');
    expect(within(debtCard).getByText('2 installments')).toBeInTheDocument();

    await user.click(
      within(debtCard).getByRole('button', {
        name: 'Open actions for Website redesign installments',
      }),
    );

    const actionsMenu = await screen.findByRole('menu', {
      name: 'Actions for Website redesign installments',
    });
    expect(
      within(actionsMenu).getByRole('menuitem', { name: 'Edit debt' }),
    ).toBeInTheDocument();
    expect(
      within(actionsMenu).getByRole('menuitem', { name: 'Delete debt' }),
    ).toBeInTheDocument();
  });

  it('shows factual overdue and due-today installment counts without an aggregate status', async () => {
    renderLedger([createInstallmentDebtFixture(baseCustomer.id)]);

    const debtCard = await getDebtCard('Website redesign installments');

    expect(within(debtCard).getByText('4 installments')).toBeInTheDocument();
    expect(within(debtCard).getByText('2 overdue')).toBeInTheDocument();
    expect(within(debtCard).getByText('1 due today')).toBeInTheDocument();
    expect(within(debtCard).queryByText('Upcoming')).not.toBeInTheDocument();
    expect(within(debtCard).queryByText('Next installment')).not.toBeInTheDocument();
    expect(within(debtCard).queryByText('$50.00')).not.toBeInTheDocument();
  });

  it('expands an installment card into ordered read-only schedule rows', async () => {
    const user = userEvent.setup();
    renderLedger([createInstallmentDebtFixture(baseCustomer.id)]);

    const debtCard = await getDebtCard('Website redesign installments');
    const expandButton = within(debtCard).getByRole('button', {
      name: 'View installments',
    });

    expect(expandButton).toHaveAttribute('aria-expanded', 'false');
    expect(
      within(debtCard).queryByRole('region', {
        name: 'Installment schedule for Website redesign installments',
      }),
    ).not.toBeInTheDocument();

    await user.click(expandButton);

    expect(expandButton).toHaveAttribute('aria-expanded', 'true');
    const schedule = within(debtCard).getByRole('region', {
      name: 'Installment schedule for Website redesign installments',
    });
    expect(expandButton).toHaveAttribute('aria-controls', schedule.id);
    const rows = within(schedule).getAllByRole('listitem');

    expect(rows).toHaveLength(4);
    expect(rows[0]).toHaveTextContent('$20.00');
    expect(rows[0]).toHaveTextContent('Overdue');
    expect(rows[1]).toHaveTextContent('$30.00');
    expect(rows[1]).toHaveTextContent('Overdue');
    expect(rows[2]).toHaveTextContent('$25.00');
    expect(rows[2]).toHaveTextContent('Due today');
    expect(rows[3]).toHaveTextContent('$25.00');
    expect(rows[3]).toHaveTextContent('Upcoming');
    expect(within(schedule).queryByRole('textbox')).not.toBeInTheDocument();

    await user.click(
      within(debtCard).getByRole('button', { name: 'Hide installments' }),
    );

    expect(expandButton).toHaveAttribute('aria-expanded', 'false');
    expect(
      within(debtCard).queryByRole('region', {
        name: 'Installment schedule for Website redesign installments',
      }),
    ).not.toBeInTheDocument();
  });

  it.each([
    {
      createDebt: () => createdDebt,
      description: 'Website redesign',
      paymentPlan: 'one-payment',
    },
    {
      createDebt: () => createInstallmentDebtFixture(baseCustomer.id),
      description: 'Website redesign installments',
      paymentPlan: 'installment',
    },
  ])(
    'keeps one debt-level payment progress bar for $paymentPlan debts',
    async ({ createDebt, description }) => {
      renderLedger([createDebt()]);

      const debtCard = await getDebtCard(description);
      const progressBars = within(debtCard).getAllByRole('progressbar');

      expect(progressBars).toHaveLength(1);
      expect(progressBars[0]).toHaveAccessibleName(
        `Payment progress for ${description}`,
      );
      expect(progressBars[0]).toHaveAttribute('aria-valuenow', '0');
    },
  );

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
    const messages = debtResources.ar.common.debts.card;

    expect(within(debtCard).getByText(messages.onePayment)).toBeInTheDocument();
    expect(within(debtCard).getByText(localizedDueDate)).toBeInTheDocument();
    expect(within(debtCard).getByText(messages.overdue)).toBeInTheDocument();
    expect(within(debtCard).getByText(messages.paid)).toBeInTheDocument();
    expect(within(debtCard).getByText(messages.remaining)).toBeInTheDocument();

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
    const messages = debtResources.tr.common.debts.card;

    expect(within(debtCard).getByText(messages.onePayment)).toBeInTheDocument();
    expect(within(debtCard).getByText(messages.dueToday)).toBeInTheDocument();
  });
  it('localizes installment expansion and keeps schedule amounts bidi-isolated in Arabic', async () => {
    window.localStorage.setItem(localeStorageKey, 'ar');
    const user = userEvent.setup();
    const messages = debtResources.ar.common.debts.card;

    renderLedger([createInstallmentDebtFixture(baseCustomer.id)]);

    const debtCard = await getDebtCard('Website redesign installments');
    await user.click(
      within(debtCard).getByRole('button', { name: messages.viewInstallments }),
    );

    const schedule = within(debtCard).getByRole('region', {
      name: messages.installmentScheduleLabel.replace(
        '{{description}}',
        'Website redesign installments',
      ),
    });

    expect(schedule.querySelectorAll('bdi[dir="ltr"]')).toHaveLength(4);
    expect(within(schedule).getAllByText(messages.overdue)).toHaveLength(2);
    expect(within(schedule).getByText(messages.dueToday)).toBeInTheDocument();
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
    expect(dialog).toHaveTextContent('Ã¢â€šÂ¬275.75');
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

  it('returns focus to Add debt after successfully deleting a debt', async () => {
    const user = userEvent.setup();
    const debt = createDebtFixture(baseCustomer.id, {
      description: 'Website redesign',
    });
    let debts = [debt];

    server.use(
      http.get(`${getBackendUrl()}/customers/:customerId/debts`, () =>
        HttpResponse.json({
          items: debts,
          page: 1,
          pageSize: 5,
          totalItems: debts.length,
          totalPages: debts.length > 0 ? 1 : 0,
        }),
      ),
      http.delete(
        `${getBackendUrl()}/customers/:customerId/debts/:debtId`,
        () => {
          debts = [];
          return new HttpResponse(null, { status: 204 });
        },
      ),
    );

    renderWithAppProviders(
      <CustomerDebtLedger
        customerId={baseCustomer.id}
        defaultCurrency="USD"
      />,
      { initialEntries: [`/customers/${baseCustomer.id}`] },
    );

    const addDebtButton = await screen.findByRole('button', {
      name: 'Add debt',
    });
    await screen.findByRole('heading', { name: debt.description });
    const { actionsMenu } = await openDebtActionMenu(user, debt.description);
    await user.click(
      within(actionsMenu).getByRole('menuitem', { name: 'Delete debt' }),
    );
    const dialog = await screen.findByRole('dialog', { name: 'Delete debt' });

    await user.click(
      within(dialog).getByRole('button', { name: 'Delete debt' }),
    );

    await waitFor(() =>
      expect(
        screen.queryByRole('heading', { name: debt.description }),
      ).not.toBeInTheDocument(),
    );
    expect(addDebtButton).toHaveFocus();
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

  it('shows a version conflict and keeps the edited debt draft without resubmitting', async () => {
    const user = userEvent.setup();
    let replaceRequestCount = 0;

    server.use(
      http.put(
        `${getBackendUrl()}/customers/:customerId/debts/:debtId`,
        () => {
          replaceRequestCount += 1;
          return HttpResponse.json(
            {
              code: debtApiErrorCode.debtVersionConflict,
              message: 'Debt was changed by another request.',
            },
            { status: 409 },
          );
        },
      ),
    );

    const { drawer } = await openSelectedDebtEditor(user);
    const descriptionInput = within(drawer).getByLabelText('Description');
    await user.clear(descriptionInput);
    await user.type(descriptionInput, 'Updated website redesign');
    await user.click(within(drawer).getByRole('button', { name: 'Save debt' }));

    const error = await screen.findByRole('alert', {
      name: 'Could not update debt',
    });
    expect(error).toHaveTextContent(
      'This debt was changed elsewhere. Review it before saving.',
    );
    expect(screen.getByRole('dialog', { name: 'Edit debt' })).toBeInTheDocument();
    expect(descriptionInput).toHaveValue('Updated website redesign');
    expect(replaceRequestCount).toBe(1);
  });

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




