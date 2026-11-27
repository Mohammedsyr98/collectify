import '@testing-library/jest-dom/vitest';
import { cleanup, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { debtResources } from '@/features/debts';
import { getBackendUrl } from '@/shared/api';
import { localeStorageKey } from '@/shared/localization';
import { server } from '@/shared/test';
import { createDebtFixture, emptyDebtList } from './debtTestData';
import { customerMessages, debtMessages } from './customerDetailsTestMessages';
import {
  baseCustomer,
  customerList,
  emptyCustomerList,
  resetCustomerTestEnvironment,
} from './customerDetailsTestData';
import { customerDetailsResources } from '../localization/resources';
import { renderCustomerRoutes } from './renderCustomerRoutes';

const debtDeleteSuccessDescription = (description: string) =>
  debtMessages.toast.delete.successDescription.replace('{{description}}', description);
const debtOpenMenuLabel = (description: string) =>
  debtMessages.card.actions.openMenu.replace('{{description}}', description);
const debtActionsMenuLabel = (description: string) =>
  debtMessages.card.actions.menuLabel.replace('{{description}}', description);
const deletionConflictDescriptions = [
  {
    locale: 'en',
    description: 'This debt has recorded payments and cannot be deleted.',
  },
  {
    locale: 'tr',
    description: 'Bu borçta kayıtlı ödemeler var, bu nedenle silinemez.',
  },
  {
    locale: 'ar',
    description: 'توجد مدفوعات مسجلة لهذا الدين، لذلك لا يمكن حذفه.',
  },
] as const;

describe('CustomerDetailsPage debt actions', () => {
  beforeEach(() => {
    resetCustomerTestEnvironment();
    server.use(
      http.get(`${getBackendUrl()}/customers`, () => HttpResponse.json(emptyCustomerList)),
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
      http.get(`${getBackendUrl()}/customers/:customerId`, () => HttpResponse.json(baseCustomer)),
    );

    renderCustomerRoutes([`/customers/${baseCustomer.id}`]);

    const headerAddDebtButton = (
      await screen.findAllByRole('button', {
        name: customerMessages.actions.addDebt,
      })
    )[0]!;
    const debtSection = await screen.findByRole('region', {
      name: debtMessages.section.title,
    });
    const ledgerAddDebtButton = within(debtSection).getByRole('button', {
      name: customerMessages.actions.addDebt,
    });

    await user.click(headerAddDebtButton);
    expect(
      await screen.findByRole('dialog', { name: debtMessages.drawer.createTitle }),
    ).toBeInTheDocument();
    await user.keyboard('{Escape}');
    await waitFor(() => expect(headerAddDebtButton).toHaveFocus());

    await user.click(ledgerAddDebtButton);
    expect(
      await screen.findByRole('dialog', { name: debtMessages.drawer.createTitle }),
    ).toBeInTheDocument();
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
      http.delete(`${getBackendUrl()}/customers/:customerId/debts/:debtId`, () => {
        deleteRequestCount += 1;
        isDeleted = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );

    renderCustomerRoutes(['/customers', `/customers/${baseCustomer.id}`], {
      defaultCurrency: 'USD',
    });

    await screen.findByRole('heading', { name: initialDebt.description });
    const { actionsMenu } = await openDebtActionMenu(user, initialDebt.description);
    await user.click(
      within(actionsMenu).getByRole('menuitem', { name: debtMessages.card.actions.delete }),
    );
    const dialog = await screen.findByRole('dialog', { name: debtMessages.delete.title });

    await user.click(within(dialog).getByRole('button', { name: debtMessages.delete.confirm }));

    expect(deleteRequestCount).toBe(1);
    expect(
      await screen.findByRole('status', { name: debtMessages.toast.delete.successTitle }),
    ).toHaveTextContent(debtDeleteSuccessDescription('Website redesign'));
    await waitFor(() =>
      expect(
        screen.queryByRole('heading', { name: initialDebt.description }),
      ).not.toBeInTheDocument(),
    );
    expect(
      await screen.findByRole('region', {
        name: customerMessages.details.financialSummary,
      }),
    ).toHaveTextContent(customerMessages.details.noFinancialActivity);

    await user.click(screen.getByRole('button', { name: 'Go back' }));
    expect(await screen.findByRole('cell', { name: baseCustomer.name })).toBeInTheDocument();
    expect(
      await screen.findByRole('cell', {
        name: `${baseCustomer.name} remaining balances`,
      }),
    ).toBeEmptyDOMElement();
  });

  it.each([
    { paymentCount: 1, closeWithEscape: true },
    { paymentCount: 3, closeWithEscape: false },
  ])(
    'explains why a debt with $paymentCount payment(s) cannot be deleted and offers only Close',
    async ({ paymentCount, closeWithEscape }) => {
      const user = userEvent.setup();
      const initialDebt = createDebtFixture(baseCustomer.id, {
        description: 'Debt with payments',
        paymentCount,
        paidAmount: '25.00',
        remainingAmount: '100.50',
        paymentState: 'partiallyPaid',
      });
      let deleteRequestCount = 0;

      server.use(
        http.get(`${getBackendUrl()}/customers/:customerId`, () => HttpResponse.json(baseCustomer)),
        http.get(`${getBackendUrl()}/customers/:customerId/debts`, () =>
          HttpResponse.json({
            ...emptyDebtList,
            items: [initialDebt],
            totalItems: 1,
            totalPages: 1,
          }),
        ),
        http.delete(`${getBackendUrl()}/customers/:customerId/debts/:debtId`, () => {
          deleteRequestCount += 1;
          return new HttpResponse(null, { status: 204 });
        }),
      );

      renderCustomerRoutes([`/customers/${baseCustomer.id}`]);

      await screen.findByRole('heading', { name: initialDebt.description });
      const { actionsMenu, actionsTrigger } = await openDebtActionMenu(
        user,
        initialDebt.description,
      );
      await user.click(
        within(actionsMenu).getByRole('menuitem', {
          name: debtMessages.card.actions.delete,
        }),
      );

      const dialog = await screen.findByRole('dialog', {
        name: debtMessages.delete.paymentBlockedTitle,
      });
      expect(
        within(dialog).getByText(
          paymentCount === 1
            ? debtMessages.delete.paymentBlockedDescriptionOne
            : debtMessages.delete.paymentBlockedDescriptionMany,
        ),
      ).toBeInTheDocument();
      expect(within(dialog).getByText(debtMessages.delete.paymentCountLabel)).toBeInTheDocument();
      expect(within(dialog).getByText(String(paymentCount))).toBeInTheDocument();
      expect(within(dialog).getAllByRole('button')).toHaveLength(1);

      const closeButton = within(dialog).getByRole('button', {
        name: debtMessages.delete.close,
      });
      await waitFor(() => expect(closeButton).toHaveFocus());
      if (closeWithEscape) {
        await user.keyboard('{Escape}');
      } else {
        await user.click(closeButton);
      }

      await waitFor(() => expect(dialog).not.toBeInTheDocument());
      expect(deleteRequestCount).toBe(0);
      await waitFor(() => expect(actionsTrigger).toHaveFocus());
    },
  );

  it.each(deletionConflictDescriptions)(
    'explains why a debt with recorded payments cannot be deleted in $locale',
    async ({ locale, description }) => {
      const user = userEvent.setup();
      const initialDebt = createDebtFixture(baseCustomer.id, {
        description: 'Debt that gained a payment',
      });
      const localizedDebtMessages = {
        ...debtResources[locale].common.debts,
        ...customerDetailsResources[locale].common.debts,
      };
      window.localStorage.setItem(localeStorageKey, locale);

      server.use(
        http.get(`${getBackendUrl()}/customers/:customerId`, () => HttpResponse.json(baseCustomer)),
        http.get(`${getBackendUrl()}/customers/:customerId/debts`, () =>
          HttpResponse.json({
            ...emptyDebtList,
            items: [initialDebt],
            totalItems: 1,
            totalPages: 1,
          }),
        ),
        http.delete(`${getBackendUrl()}/customers/:customerId/debts/:debtId`, () =>
          HttpResponse.json(
            {
              code: 'DEBT_HAS_PAYMENTS',
              message: 'The debt now has recorded payments.',
            },
            { status: 409 },
          ),
        ),
      );

      renderCustomerRoutes([`/customers/${baseCustomer.id}`]);

      await screen.findByRole('heading', { name: initialDebt.description });
      const debtCard = getDebtCard(initialDebt.description);
      await user.click(
        within(debtCard).getByRole('button', {
          name: localizedDebtMessages.card.actions.openMenu.replace(
            '{{description}}',
            initialDebt.description,
          ),
        }),
      );
      const actionsMenu = await screen.findByRole('menu', {
        name: localizedDebtMessages.card.actions.menuLabel.replace(
          '{{description}}',
          initialDebt.description,
        ),
      });
      await user.click(
        within(actionsMenu).getByRole('menuitem', {
          name: localizedDebtMessages.card.actions.delete,
        }),
      );
      const dialog = await screen.findByRole('dialog', {
        name: localizedDebtMessages.delete.title,
      });
      await user.click(
        within(dialog).getByRole('button', {
          name: localizedDebtMessages.delete.confirm,
        }),
      );

      const errorToast = await screen.findByRole('alert', {
        name: localizedDebtMessages.toast.delete.errorTitle,
      });
      expect(errorToast).toHaveTextContent(description);
    },
  );

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
      http.put(`${getBackendUrl()}/customers/:customerId/debts/:debtId`, () => {
        isReplaced = true;

        return HttpResponse.json(updatedDebt);
      }),
    );

    renderCustomerRoutes(['/customers', `/customers/${baseCustomer.id}`], {
      defaultCurrency: 'USD',
    });

    await screen.findByRole('heading', { name: initialDebt.description });
    const debtCard = getDebtCard(initialDebt.description);

    await user.click(
      within(debtCard).getByRole('button', {
        name: debtOpenMenuLabel(initialDebt.description),
      }),
    );
    const actionsMenu = await screen.findByRole('menu', {
      name: debtActionsMenuLabel(initialDebt.description),
    });
    await user.click(
      within(actionsMenu).getByRole('menuitem', { name: debtMessages.card.actions.edit }),
    );
    const drawer = await screen.findByRole('dialog', { name: debtMessages.drawer.editTitle });
    const descriptionInput = within(drawer).getByLabelText(debtMessages.form.descriptionLabel);
    const amountInput = within(drawer).getByLabelText(debtMessages.form.totalAmountLabel);
    const currencySelect = within(drawer).getByLabelText(debtMessages.form.currencyLabel);
    const dueDateInput = within(drawer).getByLabelText(debtMessages.form.dueDateLabel);

    await user.clear(descriptionInput);
    await user.type(descriptionInput, updatedDebt.description);
    await user.clear(amountInput);
    await user.type(amountInput, '275.7');
    await user.selectOptions(currencySelect, 'EUR');
    await user.clear(dueDateInput);
    await user.type(dueDateInput, '2026-10-15');
    await user.click(within(drawer).getByRole('button', { name: debtMessages.form.save }));

    expect(
      await screen.findByRole('status', { name: debtMessages.toast.edit.successTitle }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('dialog', { name: debtMessages.drawer.editTitle }),
    ).not.toBeInTheDocument();
    await screen.findByRole('heading', { name: updatedDebt.description });
    const updatedDebtCard = getDebtCard(updatedDebt.description);

    expect(updatedDebtCard).toHaveTextContent('€275.70');
    expect(within(updatedDebtCard).getByRole('time')).toHaveAttribute('datetime', '2026-10-15');

    const summary = await screen.findByRole('region', {
      name: customerMessages.details.financialSummary,
    });
    expect(summary).toHaveTextContent('€275.70');

    await user.click(screen.getByRole('button', { name: 'Go back' }));
    expect(await screen.findByRole('cell', { name: baseCustomer.name })).toBeInTheDocument();
    expect(
      await screen.findByRole('cell', {
        name: `${baseCustomer.name} remaining balances`,
      }),
    ).toHaveTextContent('EUR 275.70');
  });

  it('keeps the edit draft open and does not refetch after a version conflict', async () => {
    const user = userEvent.setup();
    const initialDebt = createDebtFixture(baseCustomer.id, {
      description: 'Website redesign',
      totalAmount: '125.50',
      currency: 'USD',
    });
    let debtListFetchCount = 0;
    let customerFetchCount = 0;

    server.use(
      http.get(`${getBackendUrl()}/customers/:customerId`, () => {
        customerFetchCount += 1;
        return HttpResponse.json(baseCustomer);
      }),
      http.get(`${getBackendUrl()}/customers/:customerId/debts`, () => {
        debtListFetchCount += 1;
        return HttpResponse.json({
          ...emptyDebtList,
          items: [initialDebt],
          totalItems: 1,
          totalPages: 1,
        });
      }),
      http.put(`${getBackendUrl()}/customers/:customerId/debts/:debtId`, () =>
        HttpResponse.json(
          {
            code: 'DEBT_VERSION_CONFLICT',
            message: 'Debt was changed elsewhere.',
          },
          { status: 409 },
        ),
      ),
    );

    renderCustomerRoutes([`/customers/${baseCustomer.id}`], {
      defaultCurrency: 'USD',
    });

    await screen.findByRole('heading', { name: initialDebt.description });
    const debtCard = getDebtCard(initialDebt.description);
    await user.click(
      within(debtCard).getByRole('button', {
        name: debtOpenMenuLabel(initialDebt.description),
      }),
    );
    const actionsMenu = await screen.findByRole('menu', {
      name: debtActionsMenuLabel(initialDebt.description),
    });
    await user.click(
      within(actionsMenu).getByRole('menuitem', { name: debtMessages.card.actions.edit }),
    );

    const drawer = await screen.findByRole('dialog', { name: debtMessages.drawer.editTitle });
    const description = within(drawer).getByLabelText(debtMessages.form.descriptionLabel);
    await user.clear(description);
    await user.type(description, 'My draft should stay');
    const debtListFetchesBeforeSave = debtListFetchCount;
    const customerFetchesBeforeSave = customerFetchCount;
    await user.click(within(drawer).getByRole('button', { name: debtMessages.form.save }));

    const conflictDescription = debtMessages.errors['DEBT_VERSION_CONFLICT'];
    expect(
      await screen.findByRole('alert', { name: debtMessages.toast.edit.errorTitle }),
    ).toHaveTextContent(conflictDescription);
    expect(screen.getByRole('dialog', { name: debtMessages.drawer.editTitle })).toBeInTheDocument();
    expect(within(drawer).getByLabelText(debtMessages.form.descriptionLabel)).toHaveValue(
      'My draft should stay',
    );
    expect(debtListFetchCount).toBe(debtListFetchesBeforeSave);
    expect(customerFetchCount).toBe(customerFetchesBeforeSave);
  });
});

async function openDebtActionMenu(
  user: ReturnType<typeof userEvent.setup>,
  description: string,
): Promise<{ actionsMenu: HTMLElement; actionsTrigger: HTMLElement }> {
  const debtCard = getDebtCard(description);
  const actionsTrigger = within(debtCard).getByRole('button', {
    name: debtOpenMenuLabel(description),
  });

  await user.click(actionsTrigger);

  return {
    actionsMenu: await screen.findByRole('menu', {
      name: debtActionsMenuLabel(description),
    }),
    actionsTrigger,
  };
}

function getDebtCard(description: string): HTMLElement {
  const debtCard = screen.getByRole('heading', { name: description }).closest('article');

  if (!debtCard) {
    throw new Error('Expected the debt heading to belong to a debt card.');
  }

  return debtCard;
}
