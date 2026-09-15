import '@testing-library/jest-dom/vitest';
import { cleanup, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { DebtListResponse, DebtResponse, SessionResponse } from '@collectify/contracts';

import App from '../../../App';
import { getBackendUrl } from '../../../shared/api/http';
import { localeStorageKey } from '../../../shared/localization';
import { renderWithAppProviders } from '../../../shared/test/render';
import { server } from '../../../shared/test/server';
import {
  baseCustomer,
  emptyCustomerList,
  emptyDebtList,
  resetCustomerTestEnvironment,
} from '../../customers/__tests__/customerTestData';

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

const createdDebt: DebtResponse = {
  id: 'debt_123',
  customerId: baseCustomer.id,
  description: 'Website redesign',
  totalAmount: '125.50',
  currency: 'USD',
  paymentPlanType: 'onePayment',
  scheduleItems: [
    {
      id: 'schedule_123',
      position: 1,
      amount: '125.50',
      dueDate: '2026-09-30',
      timing: 'upcoming',
    },
  ],
  createdAt: '2026-09-12T10:00:00.000Z',
  updatedAt: '2026-09-12T10:00:00.000Z',
};

describe('Customer debt workflow', () => {
  beforeEach(() => {
    resetCustomerTestEnvironment();
    server.use(
      http.get(`${getBackendUrl()}/customers`, () =>
        HttpResponse.json(emptyCustomerList),
      ),
    );
  });

  afterEach(() => {
    cleanup();
  });

  it('creates a debt from customer details and keeps the debt after a route remount', async () => {
    const user = userEvent.setup();
    let debtList: DebtListResponse = emptyDebtList;
    let customerDetails = baseCustomer;

    server.use(
      http.get(`${getBackendUrl()}/session`, () =>
        HttpResponse.json(ownerSession),
      ),
      http.get(`${getBackendUrl()}/customers/:customerId`, () =>
        HttpResponse.json(customerDetails),
      ),
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
        customerDetails = {
          ...baseCustomer,
          financialSummary: [
            {
              currency: 'USD',
              totalDebtAmount: '125.50',
              totalPaidAmount: '0.00',
              remainingAmount: '125.50',
            },
          ],
        };
        return HttpResponse.json(createdDebt, { status: 201 });
      }),
    );

    const firstRender = renderWithAppProviders(<App />, {
      initialEntries: [`/customers/${baseCustomer.id}`],
    });

    expect(
      await screen.findByRole('heading', { name: baseCustomer.name }),
    ).toBeInTheDocument();

    const addDebtButton = screen.getByRole('button', { name: 'Add debt' });
    expect(addDebtButton).toBeEnabled();
    await user.click(addDebtButton);

    const drawer = await screen.findByRole('dialog', { name: 'Add debt' });
    expect(within(drawer).getByLabelText('Description')).toHaveFocus();
    await user.type(within(drawer).getByLabelText('Description'), 'Website redesign');
    await user.type(within(drawer).getByLabelText('Total amount'), '125.50');
    await user.selectOptions(within(drawer).getByLabelText('Currency'), 'USD');
    await user.type(within(drawer).getByLabelText('Due date'), '2026-09-30');
    await user.click(within(drawer).getByRole('button', { name: 'Save debt' }));

    expect(await screen.findByText('Website redesign')).toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'Debt created' })).toBeInTheDocument();

    firstRender.unmount();
    renderWithAppProviders(<App />, {
      initialEntries: [`/customers/${baseCustomer.id}`],
    });

    expect(await screen.findByText('Website redesign')).toBeInTheDocument();
  }, 10_000);

  it('closes with Escape and returns focus to the Add debt trigger', async () => {
    const user = userEvent.setup();

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

    renderWithAppProviders(<App />, {
      initialEntries: [`/customers/${baseCustomer.id}`],
    });

    expect(
      await screen.findByRole('heading', { name: baseCustomer.name }),
    ).toBeInTheDocument();

    const addDebtButton = screen.getByRole('button', { name: 'Add debt' });
    await user.click(addDebtButton);
    await screen.findByRole('dialog', { name: 'Add debt' });

    await user.keyboard('{Escape}');

    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Add debt' })).not.toBeInTheDocument(),
    );
    expect(addDebtButton).toHaveFocus();
  });

  it('shows the complete localized one-payment debt card', async () => {
    server.use(
      http.get(`${getBackendUrl()}/session`, () =>
        HttpResponse.json(ownerSession),
      ),
      http.get(`${getBackendUrl()}/customers/:customerId`, () =>
        HttpResponse.json(baseCustomer),
      ),
      http.get(`${getBackendUrl()}/customers/:customerId/debts`, () =>
        HttpResponse.json({
          items: [createdDebt],
          page: 1,
          pageSize: 5,
          totalItems: 1,
          totalPages: 1,
        } satisfies DebtListResponse),
      ),
    );

    renderWithAppProviders(<App />, {
      initialEntries: [`/customers/${baseCustomer.id}`],
    });

    const description = await screen.findByRole('heading', {
      name: 'Website redesign',
    });
    const debtCard = description.closest('article');

    if (!debtCard) {
      throw new Error('Expected the debt description to belong to a debt card.');
    }

    expect(within(debtCard).getByText('$125.50')).toBeInTheDocument();
    expect(within(debtCard).getByText('One payment')).toBeInTheDocument();
    expect(within(debtCard).getByText('September 30, 2026')).toBeInTheDocument();
    expect(within(debtCard).queryByText('Due today')).not.toBeInTheDocument();
    expect(within(debtCard).queryByText('Overdue')).not.toBeInTheDocument();
  });

  it('shows the applicable timing label on each debt', async () => {
    const dueTodayDebt: DebtResponse = {
      ...createdDebt,
      id: 'debt_due_today',
      description: 'Office supplies',
      scheduleItems: [
        {
          id: 'schedule_due_today',
          position: 1,
          amount: '125.50',
          dueDate: '2026-09-30',
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
          id: 'schedule_overdue',
          position: 1,
          amount: '125.50',
          dueDate: '2026-09-30',
          timing: 'overdue',
        },
      ],
    };

    server.use(
      http.get(`${getBackendUrl()}/session`, () =>
        HttpResponse.json(ownerSession),
      ),
      http.get(`${getBackendUrl()}/customers/:customerId`, () =>
        HttpResponse.json(baseCustomer),
      ),
      http.get(`${getBackendUrl()}/customers/:customerId/debts`, () =>
        HttpResponse.json({
          items: [dueTodayDebt, overdueDebt],
          page: 1,
          pageSize: 5,
          totalItems: 2,
          totalPages: 1,
        } satisfies DebtListResponse),
      ),
    );

    renderWithAppProviders(<App />, {
      initialEntries: [`/customers/${baseCustomer.id}`],
    });

    const dueTodayCard = (
      await screen.findByRole('heading', { name: 'Office supplies' })
    ).closest('article');
    const overdueCard = screen
      .getByRole('heading', { name: 'Storefront repair' })
      .closest('article');

    if (!dueTodayCard || !overdueCard) {
      throw new Error('Expected each debt description to belong to a debt card.');
    }

    expect(within(dueTodayCard).getByText('Due today')).toBeInTheDocument();
    expect(within(dueTodayCard).queryByText('Overdue')).not.toBeInTheDocument();
    expect(within(overdueCard).getByText('Overdue')).toBeInTheDocument();
    expect(within(overdueCard).queryByText('Due today')).not.toBeInTheDocument();
  });

  it('presents the debt card and drawer in Arabic with isolated money', async () => {
    const user = userEvent.setup();
    window.localStorage.setItem(localeStorageKey, 'ar');
    const arabicOwnerSession: SessionResponse = {
      ...ownerSession,
      ownerProfile: {
        defaultCurrency: 'USD',
        preferredLanguage: 'ar',
      },
    };
    const overdueDebt: DebtResponse = {
      ...createdDebt,
      scheduleItems: [
        {
          id: 'schedule_overdue_ar',
          position: 1,
          amount: '125.50',
          dueDate: '2026-09-30',
          timing: 'overdue',
        },
      ],
    };

    server.use(
      http.get(`${getBackendUrl()}/session`, () =>
        HttpResponse.json(arabicOwnerSession),
      ),
      http.get(`${getBackendUrl()}/customers/:customerId`, () =>
        HttpResponse.json(baseCustomer),
      ),
      http.get(`${getBackendUrl()}/customers/:customerId/debts`, () =>
        HttpResponse.json({
          items: [overdueDebt],
          page: 1,
          pageSize: 5,
          totalItems: 1,
          totalPages: 1,
        } satisfies DebtListResponse),
      ),
    );

    renderWithAppProviders(<App />, {
      initialEntries: [`/customers/${baseCustomer.id}`],
    });

    const description = await screen.findByRole('heading', {
      name: 'Website redesign',
    });
    const debtCard = description.closest('article');

    if (!debtCard) {
      throw new Error('Expected the debt description to belong to a debt card.');
    }

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

    expect(document.documentElement).toHaveAttribute('dir', 'rtl');
    expect(within(debtCard).getByText('دفعة واحدة')).toBeInTheDocument();
    expect(within(debtCard).getByText(localizedDueDate)).toBeInTheDocument();
    const isolatedAmount = debtCard.querySelector('bdi[dir="ltr"]');

    expect(isolatedAmount?.textContent).toBe(localizedAmount);
    expect(isolatedAmount).toHaveAttribute('dir', 'ltr');
    expect(within(debtCard).getByText('متأخر')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'أضف دينًا' }));

    const drawer = await screen.findByRole('dialog', { name: 'إضافة دين' });
    expect(drawer).toHaveClass('end-0');
    expect(drawer).not.toHaveClass('left-0', 'right-0');
    expect(within(drawer).getByLabelText('الوصف')).toBeInTheDocument();
    expect(within(drawer).getByLabelText('تاريخ الاستحقاق')).toBeInTheDocument();
    expect(
      within(drawer).getByRole('button', { name: 'حفظ الدين' }),
    ).toBeInTheDocument();
  });

  it('presents the debt card and drawer controls in Turkish', async () => {
    const user = userEvent.setup();
    window.localStorage.setItem(localeStorageKey, 'tr');
    const turkishOwnerSession: SessionResponse = {
      ...ownerSession,
      ownerProfile: {
        defaultCurrency: 'USD',
        preferredLanguage: 'tr',
      },
    };
    const dueTodayDebt: DebtResponse = {
      ...createdDebt,
      scheduleItems: [
        {
          id: 'schedule_due_today_tr',
          position: 1,
          amount: '125.50',
          dueDate: '2026-09-30',
          timing: 'dueToday',
        },
      ],
    };

    server.use(
      http.get(`${getBackendUrl()}/session`, () =>
        HttpResponse.json(turkishOwnerSession),
      ),
      http.get(`${getBackendUrl()}/customers/:customerId`, () =>
        HttpResponse.json(baseCustomer),
      ),
      http.get(`${getBackendUrl()}/customers/:customerId/debts`, () =>
        HttpResponse.json({
          items: [dueTodayDebt],
          page: 1,
          pageSize: 5,
          totalItems: 1,
          totalPages: 1,
        } satisfies DebtListResponse),
      ),
    );

    renderWithAppProviders(<App />, {
      initialEntries: [`/customers/${baseCustomer.id}`],
    });

    const description = await screen.findByRole('heading', {
      name: 'Website redesign',
    });
    const debtCard = description.closest('article');

    if (!debtCard) {
      throw new Error('Expected the debt description to belong to a debt card.');
    }

    expect(within(debtCard).getByText('Tek ödeme')).toBeInTheDocument();
    expect(within(debtCard).getByText('Vadesi bugün')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Borç ekle' }));

    const drawer = await screen.findByRole('dialog', { name: 'Borç ekle' });
    expect(within(drawer).getByLabelText('Açıklama')).toBeInTheDocument();
    expect(
      within(drawer).getByRole('button', { name: 'Borcu kaydet' }),
    ).toBeInTheDocument();
  });

  it('shows backend validation failure in a toast and preserves the draft', async () => {
    const user = userEvent.setup();

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

    renderWithAppProviders(<App />, {
      initialEntries: [`/customers/${baseCustomer.id}`],
    });

    expect(
      await screen.findByRole('heading', { name: baseCustomer.name }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Add debt' }));

    const drawer = await screen.findByRole('dialog', { name: 'Add debt' });
    await user.type(within(drawer).getByLabelText('Description'), 'Website redesign');
    await user.type(within(drawer).getByLabelText('Total amount'), '125.50');
    await user.type(within(drawer).getByLabelText('Due date'), '2026-09-30');
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
      http.get(`${getBackendUrl()}/session`, () =>
        HttpResponse.json(ownerSession),
      ),
      http.get(`${getBackendUrl()}/customers/:customerId`, () =>
        HttpResponse.json(baseCustomer),
      ),
      http.get(`${getBackendUrl()}/customers/:customerId/debts`, () =>
        HttpResponse.json(emptyDebtList),
      ),
      http.post(`${getBackendUrl()}/customers/:customerId/debts`, () =>
        HttpResponse.text('Internal server error', { status: 500 }),
      ),
    );

    renderWithAppProviders(<App />, {
      initialEntries: [`/customers/${baseCustomer.id}`],
    });

    expect(
      await screen.findByRole('heading', { name: baseCustomer.name }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Add debt' }));

    const drawer = await screen.findByRole('dialog', { name: 'Add debt' });
    await user.type(within(drawer).getByLabelText('Description'), 'Website redesign');
    await user.type(within(drawer).getByLabelText('Total amount'), '125.50');
    await user.type(within(drawer).getByLabelText('Due date'), '2026-09-30');
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
