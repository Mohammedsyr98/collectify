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
import { sharedLocalizationResources } from '../../../shared/localization/resources';
import { renderWithAppProviders } from '../../../shared/test/render';
import { server } from '../../../shared/test/server';
import { baseCustomer, resetCustomerTestEnvironment } from '../../customers/__tests__/customerTestData';
import { customerResources } from '../../customers/localization/resources';
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
const debtMessages = debtResources.en.common.debts;
const customerMessages = customerResources.en.common.customers;
const sharedMessages = sharedLocalizationResources.en.common;

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

    expect(await screen.findByText(debtMessages.section.empty)).toBeInTheDocument();
  });

  it('renders a complete one-payment debt card', async () => {
    renderLedger([createdDebt]);

    const debtCard = await getDebtCard('Website redesign');

    expect(within(debtCard).getAllByText('$125.50')).toHaveLength(2);
    expect(within(debtCard).getByText(debtMessages.card.onePayment)).toBeInTheDocument();
    expect(within(debtCard).getByText(debtMessages.card.upcoming)).toBeInTheDocument();
    expect(within(debtCard).getByText(debtMessages.card.paid)).toBeInTheDocument();
    expect(within(debtCard).getByText('$0.00')).toBeInTheDocument();
    expect(within(debtCard).getByText(debtMessages.card.remaining)).toBeInTheDocument();
    expect(within(debtCard).getByText(debtMessages.card.dueDate)).toBeInTheDocument();
    expect(within(debtCard).getByText('September 30, 2026')).toBeInTheDocument();
    expect(within(debtCard).queryByText(debtMessages.card.dueToday)).not.toBeInTheDocument();
    expect(within(debtCard).queryByText(debtMessages.card.overdue)).not.toBeInTheDocument();
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
          paidAmount: '0.00',
          remainingAmount: '60.00',
          paymentState: 'unpaid',
          paymentCount: 0,
        },
        {
          id: 'schedule_installment_2',
          position: 2,
          amount: '65.50',
          dueDate: '2026-10-30',
          timing: 'upcoming',
          paidAmount: '0.00',
          remainingAmount: '65.50',
          paymentState: 'unpaid',
          paymentCount: 0,
        },
      ],
    };

    const user = userEvent.setup();
    renderLedger([installmentDebt]);

    const debtCard = await getDebtCard('Website redesign installments');
    expect(within(debtCard).getByText(
      debtMessages.card.installmentCount.replace('{{count}}', '2'),
    )).toBeInTheDocument();

    await user.click(
      within(debtCard).getByRole('button', {
        name: debtMessages.card.actions.openMenu.replace(
          '{{description}}',
          'Website redesign installments',
        ),
      }),
    );

    const actionsMenu = await screen.findByRole('menu', {
      name: debtMessages.card.actions.menuLabel.replace(
        '{{description}}',
        'Website redesign installments',
      ),
    });
    expect(
      within(actionsMenu).getByRole('menuitem', { name: debtMessages.card.actions.edit }),
    ).toBeInTheDocument();
    expect(
      within(actionsMenu).getByRole('menuitem', { name: debtMessages.card.actions.delete }),
    ).toBeInTheDocument();
  });

  it('shows factual overdue and due-today installment counts without an aggregate status', async () => {
    renderLedger([createInstallmentDebtFixture(baseCustomer.id)]);

    const debtCard = await getDebtCard('Website redesign installments');

    expect(within(debtCard).getByText(
      debtMessages.card.installmentCount.replace('{{count}}', '4'),
    )).toBeInTheDocument();
    expect(within(debtCard).getByText(
      debtMessages.card.overdueInstallmentCount.replace('{{count}}', '2'),
    )).toBeInTheDocument();
    expect(within(debtCard).getByText(
      debtMessages.card.dueTodayInstallmentCount.replace('{{count}}', '1'),
    )).toBeInTheDocument();
    expect(within(debtCard).queryByText(debtMessages.card.upcoming)).not.toBeInTheDocument();
    expect(within(debtCard).queryByText('Next installment')).not.toBeInTheDocument();
    expect(within(debtCard).queryByText('$50.00')).not.toBeInTheDocument();
  });

  it('expands an installment card into ordered read-only schedule rows', async () => {
    const user = userEvent.setup();
    renderLedger([createInstallmentDebtFixture(baseCustomer.id)]);

    const debtCard = await getDebtCard('Website redesign installments');
    const expandButton = within(debtCard).getByRole('button', {
      name: debtMessages.card.viewInstallments,
    });

    expect(expandButton).toHaveAttribute('aria-expanded', 'false');
    expect(
      within(debtCard).queryByRole('region', {
        name: debtMessages.card.installmentScheduleLabel.replace(
          '{{description}}',
          'Website redesign installments',
        ),
      }),
    ).not.toBeInTheDocument();

    await user.click(expandButton);

    expect(expandButton).toHaveAttribute('aria-expanded', 'true');
    const schedule = within(debtCard).getByRole('region', {
      name: debtMessages.card.installmentScheduleLabel.replace(
        '{{description}}',
        'Website redesign installments',
      ),
    });
    expect(expandButton).toHaveAttribute('aria-controls', schedule.id);
    const rows = within(schedule).getAllByRole('listitem');

    expect(rows).toHaveLength(4);
    expect(rows[0]).toHaveTextContent('$20.00');
    expect(rows[0]).toHaveTextContent(debtMessages.card.overdue);
    expect(rows[1]).toHaveTextContent('$30.00');
    expect(rows[1]).toHaveTextContent(debtMessages.card.overdue);
    expect(rows[2]).toHaveTextContent('$25.00');
    expect(rows[2]).toHaveTextContent(debtMessages.card.dueToday);
    expect(rows[3]).toHaveTextContent('$25.00');
    expect(rows[3]).toHaveTextContent(debtMessages.card.upcoming);
    expect(within(schedule).queryByRole('textbox')).not.toBeInTheDocument();

    await user.click(
      within(debtCard).getByRole('button', { name: debtMessages.card.hideInstallments }),
    );

    expect(expandButton).toHaveAttribute('aria-expanded', 'false');
    expect(
      within(debtCard).queryByRole('region', {
        name: debtMessages.card.installmentScheduleLabel.replace(
          '{{description}}',
          'Website redesign installments',
        ),
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
      name: debtMessages.card.actions.openMenu.replace(
        '{{description}}',
        'Website redesign',
      ),
    });

    actionsTrigger.focus();
    await user.keyboard('{Enter}');

    const actionsMenu = await screen.findByRole('menu', {
      name: debtMessages.card.actions.menuLabel.replace(
        '{{description}}',
        'Website redesign',
      ),
    });

    expect(
      within(actionsMenu).getByRole('menuitem', { name: debtMessages.card.actions.edit }),
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

    expect(within(dueTodayCard).getByText(debtMessages.card.dueToday)).toBeInTheDocument();
    expect(within(dueTodayCard).queryByText(debtMessages.card.overdue)).not.toBeInTheDocument();
    expect(within(dueTodayCard).queryByText(debtMessages.card.upcoming)).not.toBeInTheDocument();
    expect(within(overdueCard).getByText(debtMessages.card.overdue)).toBeInTheDocument();
    expect(within(overdueCard).queryByText(debtMessages.card.dueToday)).not.toBeInTheDocument();
    expect(within(overdueCard).queryByText(debtMessages.card.upcoming)).not.toBeInTheDocument();
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

    expect(schedule.querySelectorAll('bdi[dir="ltr"]')).toHaveLength(12);
    expect(within(schedule).getAllByText(messages.overdue)).toHaveLength(2);
    expect(within(schedule).getByText(messages.dueToday)).toBeInTheDocument();
  });

  it('calls onAddDebt when the ledger Add debt action is activated', async () => {
    const user = userEvent.setup();
    const onAddDebt = vi.fn();

    renderLedger([], { onAddDebt });

    const debtSection = await screen.findByRole('region', { name: debtMessages.section.title });
    const addDebtButton = within(debtSection).getByRole('button', {
      name: customerMessages.actions.addDebt,
    });
    await user.click(addDebtButton);

    expect(onAddDebt).toHaveBeenCalledWith(addDebtButton);
  });

  it('opens the selected debt editor with its saved values', async () => {
    const user = userEvent.setup();
    const { drawer } = await openSelectedDebtEditor(user);

    expect(within(drawer).getByLabelText(debtMessages.form.descriptionLabel)).toHaveValue(
      'Website redesign',
    );
    expect(within(drawer).getByLabelText(debtMessages.form.totalAmountLabel)).toHaveValue('275.75');
    expect(within(drawer).getByLabelText(debtMessages.form.currencyLabel)).toHaveValue('EUR');
    expect(within(drawer).getByLabelText(debtMessages.form.dueDateLabel)).toHaveValue('2026-10-01');
  });

  it('returns focus to the debt menu trigger after closing the editor', async () => {
    const user = userEvent.setup();
    const { actionsTrigger } = await openSelectedDebtEditor(user);

    await user.keyboard('{Escape}');

    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: debtMessages.drawer.editTitle }),
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
      within(actionsMenu).getByRole('menuitem', { name: debtMessages.card.actions.delete }),
    );

    const dialog = await screen.findByRole('dialog', { name: debtMessages.delete.title });
    expect(dialog).toHaveTextContent(debt.description);
    expect(dialog).toHaveTextContent('€275.75');
    expect(dialog).toHaveTextContent(
      debtMessages.delete.description.replace('{{description}}', debt.description),
    );

    await user.click(within(dialog).getByRole('button', { name: debtMessages.delete.cancel }));

    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: debtMessages.delete.title }),
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
        onAddDebt={vi.fn()}
        onRecordPayment={vi.fn()}
      />,
      { initialEntries: [`/customers/${baseCustomer.id}`] },
    );

    const addDebtButton = await screen.findByRole('button', {
      name: customerMessages.actions.addDebt,
    });
    await screen.findByRole('heading', { name: debt.description });
    const { actionsMenu } = await openDebtActionMenu(user, debt.description);
    await user.click(
      within(actionsMenu).getByRole('menuitem', { name: debtMessages.card.actions.delete }),
    );
    const dialog = await screen.findByRole('dialog', { name: debtMessages.delete.title });

    await user.click(
      within(dialog).getByRole('button', { name: debtMessages.delete.confirm }),
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
    const descriptionInput = within(drawer).getByLabelText(debtMessages.form.descriptionLabel);
    await user.clear(descriptionInput);
    await user.type(descriptionInput, 'Updated website redesign');
    await user.click(within(drawer).getByRole('button', { name: debtMessages.form.save }));

    expect(
      await screen.findByRole('alert', { name: debtMessages.toast.edit.errorTitle }),
    ).toHaveTextContent(sharedMessages.errors.genericDescription);
    expect(screen.getByRole('dialog', { name: debtMessages.drawer.editTitle })).toBeInTheDocument();
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
    const descriptionInput = within(drawer).getByLabelText(debtMessages.form.descriptionLabel);
    await user.clear(descriptionInput);
    await user.type(descriptionInput, 'Updated website redesign');
    await user.click(within(drawer).getByRole('button', { name: debtMessages.form.save }));

    const error = await screen.findByRole('alert', {
      name: debtMessages.toast.edit.errorTitle,
    });
    expect(error).toHaveTextContent(
      debtMessages.errors[debtApiErrorCode.debtVersionConflict],
    );
    expect(screen.getByRole('dialog', { name: debtMessages.drawer.editTitle })).toBeInTheDocument();
    expect(descriptionInput).toHaveValue('Updated website redesign');
    expect(replaceRequestCount).toBe(1);
  });

  });


});

function renderLedger(
  debts: DebtResponse[],
  {
    onAddDebt = vi.fn(),
    onRecordPayment = vi.fn(),
  }: {
    onAddDebt?: (trigger: HTMLButtonElement) => void;
    onRecordPayment?: (
      debt: DebtResponse,
      scheduleItemId: string,
      trigger: HTMLButtonElement,
    ) => void;
  } = {},
) {
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
    <CustomerDebtLedger
      customerId={baseCustomer.id}
      onAddDebt={onAddDebt}
      onRecordPayment={onRecordPayment}
    />,
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
    within(actionsMenu).getByRole('menuitem', { name: debtMessages.card.actions.edit }),
  );

  return {
    actionsTrigger,
    drawer: await screen.findByRole('dialog', { name: debtMessages.drawer.editTitle }),
  };
}

async function openDebtActionMenu(
  user: ReturnType<typeof userEvent.setup>,
  description: string,
): Promise<{ actionsMenu: HTMLElement; actionsTrigger: HTMLElement }> {
  const debtCard = await getDebtCard(description);
  const actionsTrigger = within(debtCard).getByRole('button', {
    name: debtMessages.card.actions.openMenu.replace('{{description}}', description),
  });

  await user.click(actionsTrigger);

  return {
    actionsMenu: await screen.findByRole('menu', {
      name: debtMessages.card.actions.menuLabel.replace('{{description}}', description),
    }),
    actionsTrigger,
  };
}




