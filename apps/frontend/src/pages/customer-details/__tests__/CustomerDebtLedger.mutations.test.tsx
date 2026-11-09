import '@testing-library/jest-dom/vitest';
import { cleanup, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  debtApiErrorCode,
  debtRequestValidationCode,
  type DebtListResponse,
} from '@collectify/contracts';

import { getBackendUrl } from '@/shared/api';
import { sharedLocalizationResources } from '@/shared/localization';
import { server } from '@/shared/test';
import { baseCustomer, resetCustomerTestEnvironment } from './customerDetailsTestData';
import { customerMessages, debtMessages } from './customerDetailsTestMessages';
import { renderCustomerRoutes } from './renderCustomerRoutes';
import { createDebtFixture, emptyDebtList } from './debtTestData';

const createdDebt = createDebtFixture('customer_123');
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
      http.get(`${getBackendUrl()}/customers/:customerId`, () => HttpResponse.json(baseCustomer)),
      http.get(`${getBackendUrl()}/customers/:customerId/debts`, () =>
        HttpResponse.json(emptyDebtList),
      ),
    );
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  describe('customer-route mutations', () => {
    describe('creation', () => {
      it('creates a debt from customer details and keeps it after a route remount', async () => {
        const user = userEvent.setup();
        let debtList: DebtListResponse = emptyDebtList;
        let creationRequest: unknown;

        server.use(
          http.get(`${getBackendUrl()}/customers/:customerId/debts`, () =>
            HttpResponse.json(debtList),
          ),
          http.post(`${getBackendUrl()}/customers/:customerId/debts`, async ({ request }) => {
            creationRequest = await request.json();
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

        const firstRender = renderCustomerDebtRoute([`/customers/${baseCustomer.id}`]);
        const drawer = await openAndFillDebtDrawer(user);

        await user.click(within(drawer).getByRole('button', { name: debtMessages.form.save }));

        expect(await screen.findByText('Website redesign')).toBeInTheDocument();
        expect(
          screen.getByRole('status', { name: debtMessages.toast.create.successTitle }),
        ).toBeInTheDocument();

        expect(creationRequest).toEqual({
          description: 'Website redesign',
          totalAmount: '125.50',
          currency: 'USD',
          scheduleItems: [{ amount: '125.50', dueDate: '2026-09-30' }],
        });

        firstRender.unmount();
        renderCustomerDebtRoute([`/customers/${baseCustomer.id}`]);

        expect(await screen.findByText('Website redesign')).toBeInTheDocument();
      }, 10_000);
    });

    describe('editing', () => {
      it('updates an existing debt through customer details and refreshes the ledger', async () => {
        const user = userEvent.setup();
        const initialDebt = createDebtFixture(baseCustomer.id, {
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
        const updatedDebt = {
          ...initialDebt,
          description: 'Updated website redesign',
        };
        let debtList: DebtListResponse = {
          items: [initialDebt],
          page: 1,
          pageSize: 5,
          totalItems: 1,
          totalPages: 1,
        };
        let replacementRequest: unknown;
        let requestedDebtId: string | undefined;
        const messages = debtMessages;

        server.use(
          http.get(`${getBackendUrl()}/customers/:customerId/debts`, () =>
            HttpResponse.json(debtList),
          ),
          http.put(
            `${getBackendUrl()}/customers/:customerId/debts/:debtId`,
            async ({ params, request }) => {
              requestedDebtId = String(params.debtId);
              replacementRequest = await request.json();
              debtList = { ...debtList, items: [updatedDebt] };
              return HttpResponse.json(updatedDebt);
            },
          ),
        );

        renderCustomerDebtRoute([`/customers/${baseCustomer.id}`]);

        const { actionsMenu } = await openDebtActionMenu(user, initialDebt.description);
        await user.click(
          within(actionsMenu).getByRole('menuitem', { name: debtMessages.card.actions.edit }),
        );

        const drawer = await screen.findByRole('dialog', { name: debtMessages.drawer.editTitle });
        const descriptionInput = within(drawer).getByLabelText(debtMessages.form.descriptionLabel);
        await user.clear(descriptionInput);
        await user.type(descriptionInput, updatedDebt.description);
        await user.click(within(drawer).getByRole('button', { name: debtMessages.form.save }));

        await waitFor(() =>
          expect(replacementRequest).toEqual({
            description: updatedDebt.description,
            totalAmount: '275.75',
            currency: 'EUR',
            expectedVersion: 1,
            scheduleItems: [
              {
                id: 'schedule_123',
                amount: '275.75',
                dueDate: '2026-10-01',
              },
            ],
          }),
        );
        expect(requestedDebtId).toBe(initialDebt.id);
        expect(
          await screen.findByRole('status', {
            name: messages.toast.edit.successTitle,
          }),
        ).toBeInTheDocument();
        expect(
          screen.queryByRole('dialog', { name: debtMessages.drawer.editTitle }),
        ).not.toBeInTheDocument();
        expect(await screen.findByText(updatedDebt.description)).toBeInTheDocument();
        expect(screen.queryByText(initialDebt.description)).not.toBeInTheDocument();
      });
    });

    describe('creation failure states', () => {
      it('shows backend validation failure in a toast and preserves the draft', async () => {
        const user = userEvent.setup();

        server.use(
          http.post(`${getBackendUrl()}/customers/:customerId/debts`, () =>
            HttpResponse.json(
              {
                code: 'VALIDATION_ERROR',
                message: 'Check the highlighted fields.',
                fieldErrors: {
                  scheduleItems: ['Enter a valid due date.'],
                },
              },
              { status: 400 },
            ),
          ),
        );

        renderCustomerDebtRoute([`/customers/${baseCustomer.id}`]);
        const drawer = await openAndFillDebtDrawer(user);

        await user.click(within(drawer).getByRole('button', { name: debtMessages.form.save }));

        expect(
          await screen.findByRole('alert', { name: debtMessages.toast.create.errorTitle }),
        ).toHaveTextContent(debtMessages.errors[debtApiErrorCode.validationError]);
        expect(
          screen.queryByText(debtMessages.validation[debtRequestValidationCode.debtDueDateInvalid]),
        ).not.toBeInTheDocument();
        expect(within(drawer).getByLabelText(debtMessages.form.dueDateLabel)).toHaveValue(
          '2026-09-30',
        );
        expect(within(drawer).getByLabelText(debtMessages.form.descriptionLabel)).toHaveValue(
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

        renderCustomerDebtRoute([`/customers/${baseCustomer.id}`]);
        const drawer = await openAndFillDebtDrawer(user);

        await user.click(within(drawer).getByRole('button', { name: debtMessages.form.save }));

        expect(
          await screen.findByRole('alert', { name: debtMessages.toast.create.errorTitle }),
        ).toHaveTextContent(sharedMessages.errors.genericDescription);
        expect(drawer).toBeInTheDocument();
        expect(within(drawer).getByLabelText(debtMessages.form.descriptionLabel)).toHaveValue(
          'Website redesign',
        );
      }, 10_000);
    });
  });
});
async function getDebtCard(description: string): Promise<HTMLElement> {
  const debtCard = (await screen.findByRole('heading', { name: description })).closest('article');

  if (!debtCard) {
    throw new Error('Expected the debt description to belong to a debt card.');
  }

  return debtCard;
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

function renderCustomerDebtRoute(initialEntries: string[]) {
  return renderCustomerRoutes(initialEntries);
}

async function openAndFillDebtDrawer(user: ReturnType<typeof userEvent.setup>) {
  expect(await screen.findByRole('heading', { name: baseCustomer.name })).toBeInTheDocument();

  const debtRegion = screen.getByRole('region', { name: debtMessages.section.title });
  const addDebtButton = within(debtRegion).getByRole('button', {
    name: customerMessages.actions.addDebt,
  });
  expect(addDebtButton).toBeEnabled();
  await user.click(addDebtButton);

  const drawer = await screen.findByRole('dialog', { name: debtMessages.drawer.createTitle });
  await user.type(
    within(drawer).getByLabelText(debtMessages.form.descriptionLabel),
    'Website redesign',
  );
  await user.type(within(drawer).getByLabelText(debtMessages.form.totalAmountLabel), '125.50');
  await user.selectOptions(within(drawer).getByLabelText(debtMessages.form.currencyLabel), 'USD');
  await user.type(within(drawer).getByLabelText(debtMessages.form.dueDateLabel), '2026-09-30');

  return drawer;
}
