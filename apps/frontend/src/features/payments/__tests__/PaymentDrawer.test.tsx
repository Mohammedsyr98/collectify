import '@testing-library/jest-dom/vitest';
import { cleanup, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
import { useRef, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { PaymentTarget } from '@collectify/contracts';

import { getBackendUrl } from '../../../shared/api/http';
import { localeStorageKey } from '../../../shared/localization';
import { renderWithAppProviders } from '../../../shared/test/render';
import { server } from '../../../shared/test/server';
import type { PaymentSubmissionRequest } from '../api/record-payment';
import { PaymentDrawer } from '../editor/PaymentDrawer';
import { createPaymentTargetFixture } from './paymentTestData';

describe('PaymentDrawer', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.lang = '';
    document.documentElement.removeAttribute('dir');
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('records a payment against an exact initial target', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn(async () => undefined);
    const target = createPaymentTargetFixture({
      scheduleItemId: 'schedule_123',
      debtVersion: 7,
    });

    renderPaymentDrawer(target, onSubmit);

    const drawer = screen.getByRole('dialog', { name: 'Record payment' });
    await user.type(within(drawer).getByLabelText('Payment amount'), '25.20');
    await user.type(within(drawer).getByLabelText('Note (optional)'), 'cash');
    await user.click(within(drawer).getByRole('button', { name: 'Record payment' }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: '25.20',
          expectedDebtVersion: 7,
          note: 'cash',
          paymentDate: expect.any(String),
          targetScheduleItemId: 'schedule_123',
        }),
      ),
    );
  });

  it('opens target selection and requests alternatives only after Change target', async () => {
    const user = userEvent.setup();
    const target = createPaymentTargetFixture();
    let targetListRequestCount = 0;

    server.use(
      http.get(`${getBackendUrl()}/customers/:customerId/payment-targets`, () => {
        targetListRequestCount += 1;

        return HttpResponse.json({
          items: [],
          page: 1,
          pageSize: 10,
          totalItems: 0,
          totalPages: 0,
        });
      }),
    );

    renderPaymentDrawer(target);
    const drawer = screen.getByRole('dialog', { name: 'Record payment' });
    const changeTarget = await within(drawer).findByRole('button', {
      name: 'Change target',
    });

    expect(targetListRequestCount).toBe(0);

    await user.click(changeTarget);

    expect(
      await within(drawer).findByRole('heading', {
        name: 'Choose payment target',
      }),
    ).toBeInTheDocument();
    await waitFor(() => expect(targetListRequestCount).toBe(1));
  });

  it('preserves and revalidates the draft when changing to a same-currency target', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn(async () => undefined);
    const initialTarget = createPaymentTargetFixture({
      debtDescription: 'Office equipment',
      remainingAmount: '75.00',
    });
    const replacementTarget = createPaymentTargetFixture({
      scheduleItemId: 'schedule_replacement',
      debtId: 'debt_replacement',
      debtDescription: 'Replacement equipment',
      remainingAmount: '10.00',
    });
    const otherTarget = createPaymentTargetFixture({
      scheduleItemId: 'schedule_other',
      debtId: 'debt_other',
      debtDescription: 'Other office expense',
    });

    server.use(
      http.get(`${getBackendUrl()}/customers/:customerId/payment-targets`, () =>
        HttpResponse.json({
          items: [replacementTarget, otherTarget],
          page: 1,
          pageSize: 10,
          totalItems: 2,
          totalPages: 1,
        }),
      ),
    );

    renderPaymentDrawer(initialTarget, onSubmit);

    const drawer = screen.getByRole('dialog', { name: 'Record payment' });
    const amount = within(drawer).getByLabelText('Payment amount');
    const paymentDate = within(drawer).getByLabelText('Payment date');
    const note = within(drawer).getByLabelText('Note (optional)');

    await user.type(amount, '25.00');
    await user.clear(paymentDate);
    await user.type(paymentDate, '2026-10-01');
    await user.type(note, 'replace the damaged item');
    await user.click(within(drawer).getByRole('button', { name: 'Change target' }));
    await user.click(await within(drawer).findByRole('button', { name: /Replacement equipment/ }));

    expect(within(drawer).getByLabelText('Payment amount')).toHaveValue('25.00');
    expect(within(drawer).getByLabelText('Payment date')).toHaveValue('2026-10-01');
    expect(within(drawer).getByLabelText('Note (optional)')).toHaveValue(
      'replace the damaged item',
    );

    await user.click(within(drawer).getByRole('button', { name: 'Record payment' }));

    expect(
      within(drawer).getByText('Payment exceeds the target remaining amount.'),
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('clears the amount while preserving date and note for a different-currency target', async () => {
    const user = userEvent.setup();
    const initialTarget = createPaymentTargetFixture({
      debtDescription: 'Office equipment',
      currency: 'USD',
    });
    const differentCurrencyTarget = createPaymentTargetFixture({
      scheduleItemId: 'schedule_eur',
      debtId: 'debt_eur',
      debtDescription: 'European office expense',
      currency: 'EUR',
    });
    const otherTarget = createPaymentTargetFixture({
      scheduleItemId: 'schedule_other',
      debtId: 'debt_other',
      debtDescription: 'Other office expense',
    });

    server.use(
      http.get(`${getBackendUrl()}/customers/:customerId/payment-targets`, () =>
        HttpResponse.json({
          items: [differentCurrencyTarget, otherTarget],
          page: 1,
          pageSize: 10,
          totalItems: 2,
          totalPages: 1,
        }),
      ),
    );

    renderPaymentDrawer(initialTarget);

    const drawer = screen.getByRole('dialog', { name: 'Record payment' });
    const amount = within(drawer).getByLabelText('Payment amount');
    const paymentDate = within(drawer).getByLabelText('Payment date');
    const note = within(drawer).getByLabelText('Note (optional)');

    await user.type(amount, '25.00');
    await user.clear(paymentDate);
    await user.type(paymentDate, '2026-10-01');
    await user.type(note, 'keep this note');
    await user.click(within(drawer).getByRole('button', { name: 'Change target' }));
    await user.click(
      await within(drawer).findByRole('button', { name: /European office expense/ }),
    );

    expect(within(drawer).getByLabelText('Payment amount')).toHaveValue('');
    expect(within(drawer).getByLabelText('Payment date')).toHaveValue('2026-10-01');
    expect(within(drawer).getByLabelText('Note (optional)')).toHaveValue('keep this note');
  });

  it('shows target-selection loading feedback when opened without an initial target', async () => {
    server.use(
      http.get(`${getBackendUrl()}/customers/:customerId/payment-targets`, async () => {
        await delay('infinite');

        return HttpResponse.json({
          items: [],
          page: 1,
          pageSize: 10,
          totalItems: 0,
          totalPages: 0,
        });
      }),
    );

    renderWithAppProviders(
      <PaymentDrawer
        customerId="customer_123"
        onClose={vi.fn()}
        onSubmit={async () => undefined}
      />,
    );

    const drawer = screen.getByRole('dialog', { name: 'Record payment' });
    expect(
      within(drawer).getByRole('heading', { name: 'Choose payment target' }),
    ).toBeInTheDocument();
    expect(
      await within(drawer).findByRole('status', {
        name: 'Loading payment targets',
      }),
    ).toBeInTheDocument();
    expect(within(drawer).queryByLabelText('Payment amount')).not.toBeInTheDocument();
  });

  it('shows an empty state when no payment targets are available', async () => {
    server.use(
      http.get(`${getBackendUrl()}/customers/:customerId/payment-targets`, () =>
        HttpResponse.json({
          items: [],
          page: 1,
          pageSize: 10,
          totalItems: 0,
          totalPages: 0,
        }),
      ),
    );

    renderWithAppProviders(
      <PaymentDrawer
        customerId="customer_123"
        onClose={vi.fn()}
        onSubmit={async () => undefined}
      />,
    );

    const drawer = screen.getByRole('dialog', { name: 'Record payment' });
    expect(await within(drawer).findByText('No payment targets available.')).toBeInTheDocument();
    expect(
      within(drawer).queryByRole('status', { name: 'Loading payment targets' }),
    ).not.toBeInTheDocument();
    expect(within(drawer).queryByLabelText('Payment amount')).not.toBeInTheDocument();
  });

  it('opens the payment form automatically when only one target is available', async () => {
    const target = createPaymentTargetFixture({ remainingAmount: '42.50' });

    server.use(
      http.get(`${getBackendUrl()}/customers/:customerId/payment-targets`, () =>
        HttpResponse.json({
          items: [target],
          page: 1,
          pageSize: 10,
          totalItems: 1,
          totalPages: 1,
        }),
      ),
    );

    renderWithAppProviders(
      <PaymentDrawer
        customerId="customer_123"
        onClose={vi.fn()}
        onSubmit={async () => undefined}
      />,
    );

    const drawer = screen.getByRole('dialog', { name: 'Record payment' });
    expect(await within(drawer).findByLabelText('Payment amount')).toBeInTheDocument();
    expect(within(drawer).getByText('$42.50')).toBeInTheDocument();
  });

  it('lets the user choose a target from a small list and opens the form immediately', async () => {
    const user = userEvent.setup();
    const officeTarget = createPaymentTargetFixture();
    const rentTarget = createPaymentTargetFixture({
      scheduleItemId: 'schedule_2',
      debtId: 'debt_2',
      debtDescription: 'Warehouse rent',
      amount: '50.00',
      remainingAmount: '30.00',
    });

    server.use(
      http.get(`${getBackendUrl()}/customers/:customerId/payment-targets`, () =>
        HttpResponse.json({
          items: [officeTarget, rentTarget],
          page: 1,
          pageSize: 10,
          totalItems: 2,
          totalPages: 1,
        }),
      ),
    );

    renderWithAppProviders(
      <PaymentDrawer
        customerId="customer_123"
        onClose={vi.fn()}
        onSubmit={async () => undefined}
      />,
    );

    const drawer = screen.getByRole('dialog', { name: 'Record payment' });
    expect(
      await within(drawer).findByRole('button', { name: /Office equipment/ }),
    ).toBeInTheDocument();
    const rentTargetButton = within(drawer).getByRole('button', { name: /Warehouse rent/ });
    expect(within(drawer).queryByLabelText('Payment amount')).not.toBeInTheDocument();

    await user.click(rentTargetButton);

    expect(await within(drawer).findByLabelText('Payment amount')).toBeInTheDocument();
    expect(within(drawer).getByText('$30.00')).toBeInTheDocument();
  });

  it('identifies installments that belong to the same debt', async () => {
    const firstInstallment = createPaymentTargetFixture({
      scheduleItemId: 'schedule_1',
      debtId: 'debt_installments',
      debtDescription: 'Website redesign',
      remainingAmount: '20.00',
      dueDate: '2026-10-01',
      timing: 'overdue',
      paymentState: 'partiallyPaid',
      plan: { type: 'installment', position: 1 },
    });
    const secondInstallment = createPaymentTargetFixture({
      scheduleItemId: 'schedule_2',
      debtId: 'debt_installments',
      debtDescription: 'Website redesign',
      remainingAmount: '50.00',
      dueDate: '2026-11-01',
      timing: 'upcoming',
      paymentState: 'unpaid',
      plan: { type: 'installment', position: 2 },
    });

    server.use(
      http.get(`${getBackendUrl()}/customers/:customerId/payment-targets`, () =>
        HttpResponse.json({
          items: [firstInstallment, secondInstallment],
          page: 1,
          pageSize: 10,
          totalItems: 2,
          totalPages: 1,
        }),
      ),
    );

    renderWithAppProviders(
      <PaymentDrawer
        customerId="customer_123"
        onClose={vi.fn()}
        onSubmit={async () => undefined}
      />,
    );

    const drawer = screen.getByRole('dialog', { name: 'Record payment' });
    const firstRow = await within(drawer).findByRole('button', { name: /Installment 1/ });
    const secondRow = within(drawer).getByRole('button', { name: /Installment 2/ });

    expect(firstRow).toHaveAccessibleName('Website redesign, Installment 1');
    expect(firstRow).toHaveTextContent('October 1, 2026');
    expect(firstRow).toHaveTextContent('Overdue');
    expect(firstRow).toHaveTextContent('Partially paid');
    expect(firstRow).toHaveTextContent('$20.00');
    expect(secondRow).toHaveAccessibleName('Website redesign, Installment 2');
    expect(secondRow).toHaveTextContent('November 1, 2026');
    expect(secondRow).toHaveTextContent('Upcoming');
    expect(secondRow).toHaveTextContent('Unpaid');
    expect(secondRow).toHaveTextContent('$50.00');
  });

  it('groups targets by debt while keeping each target selectable', async () => {
    const user = userEvent.setup();
    const firstInstallment = createPaymentTargetFixture({
      scheduleItemId: 'schedule_1',
      debtId: 'debt_website',
      debtDescription: 'Website redesign',
      plan: { type: 'installment', position: 1 },
    });
    const secondInstallment = createPaymentTargetFixture({
      scheduleItemId: 'schedule_2',
      debtId: 'debt_website',
      debtDescription: 'Website redesign',
      plan: { type: 'installment', position: 2 },
    });
    const otherTarget = createPaymentTargetFixture({
      scheduleItemId: 'schedule_3',
      debtId: 'debt_office',
      debtDescription: 'Office equipment',
    });

    server.use(
      http.get(`${getBackendUrl()}/customers/:customerId/payment-targets`, () =>
        HttpResponse.json({
          items: [firstInstallment, secondInstallment, otherTarget],
          page: 1,
          pageSize: 10,
          totalItems: 3,
          totalPages: 1,
        }),
      ),
    );

    renderWithAppProviders(
      <PaymentDrawer
        customerId="customer_123"
        onClose={vi.fn()}
        onSubmit={async () => undefined}
      />,
    );

    const drawer = screen.getByRole('dialog', { name: 'Record payment' });
    const websiteGroup = await within(drawer).findByRole('group', {
      name: 'Website redesign',
    });

    expect(within(drawer).getAllByRole('heading', { name: 'Website redesign' })).toHaveLength(1);
    expect(within(websiteGroup).getAllByRole('button')).toHaveLength(2);
    expect(
      within(websiteGroup).getByRole('button', { name: /Website redesign.*Installment 1/ }),
    ).toBeInTheDocument();
    expect(
      within(websiteGroup).getByRole('button', { name: /Website redesign.*Installment 2/ }),
    ).toBeInTheDocument();
    expect(within(drawer).getByRole('group', { name: 'Office equipment' })).toBeInTheDocument();

    await user.click(
      within(websiteGroup).getByRole('button', { name: /Website redesign.*Installment 1/ }),
    );

    expect(await within(drawer).findByLabelText('Payment amount')).toBeInTheDocument();
  });

  it('shows large-picker controls when more than five targets are available', async () => {
    const targets = Array.from({ length: 6 }, (_, index) =>
      createPaymentTargetFixture({
        scheduleItemId: `schedule_${index + 1}`,
        debtId: `debt_${index + 1}`,
        debtDescription: `Debt ${index + 1}`,
        plan: { type: 'installment', position: index + 1 },
      }),
    );

    server.use(
      http.get(`${getBackendUrl()}/customers/:customerId/payment-targets`, () =>
        HttpResponse.json({
          items: targets,
          page: 1,
          pageSize: 10,
          totalItems: 6,
          totalPages: 1,
        }),
      ),
    );

    renderWithAppProviders(
      <PaymentDrawer
        customerId="customer_123"
        onClose={vi.fn()}
        onSubmit={async () => undefined}
      />,
    );

    const drawer = screen.getByRole('dialog', { name: 'Record payment' });
    expect(
      await within(drawer).findByRole('searchbox', { name: 'Search debt descriptions' }),
    ).toBeInTheDocument();
    expect(within(drawer).getByRole('combobox', { name: 'Payment status' })).toBeInTheDocument();
    expect(within(drawer).getByRole('option', { name: 'All targets' })).toBeInTheDocument();
    expect(within(drawer).getAllByRole('button', { name: /Debt [1-6]/ })).toHaveLength(6);
  });

  it('keeps the large picker open when searching narrows the results', async () => {
    const user = userEvent.setup();
    const initialTargets = Array.from({ length: 6 }, (_, index) =>
      createPaymentTargetFixture({
        scheduleItemId: `schedule_${index + 1}`,
        debtId: `debt_${index + 1}`,
        debtDescription: `Debt ${index + 1}`,
        plan: { type: 'installment', position: index + 1 },
      }),
    );
    const searchedTarget = createPaymentTargetFixture({
      scheduleItemId: 'schedule_search',
      debtId: 'debt_search',
      debtDescription: 'Website redesign',
    });
    const requestedSearches: Array<string | null> = [];

    server.use(
      http.get(`${getBackendUrl()}/customers/:customerId/payment-targets`, ({ request }) => {
        const search = new URL(request.url).searchParams.get('search');
        requestedSearches.push(search);

        return HttpResponse.json({
          items: search ? [searchedTarget] : initialTargets,
          page: 1,
          pageSize: 10,
          totalItems: search ? 1 : 6,
          totalPages: 1,
        });
      }),
    );

    renderWithAppProviders(
      <PaymentDrawer
        customerId="customer_123"
        onClose={vi.fn()}
        onSubmit={async () => undefined}
      />,
    );

    const drawer = screen.getByRole('dialog', { name: 'Record payment' });
    const searchInput = await within(drawer).findByRole('searchbox', {
      name: 'Search debt descriptions',
    });

    await user.type(searchInput, 'website');

    expect(
      await within(drawer).findByRole('button', { name: /Website redesign/ }),
    ).toBeInTheDocument();
    expect(requestedSearches).toContain('website');
    expect(
      within(drawer).getByRole('searchbox', { name: 'Search debt descriptions' }),
    ).toBeInTheDocument();
    expect(within(drawer).getByRole('combobox', { name: 'Payment status' })).toBeInTheDocument();
    expect(within(drawer).queryByLabelText('Payment amount')).not.toBeInTheDocument();
  });

  it('filters large-picker targets by payment status', async () => {
    const user = userEvent.setup();
    const initialTargets = Array.from({ length: 6 }, (_, index) =>
      createPaymentTargetFixture({
        scheduleItemId: `schedule_${index + 1}`,
        debtId: `debt_${index + 1}`,
        debtDescription: `Debt ${index + 1}`,
        plan: { type: 'installment', position: index + 1 },
      }),
    );
    const unpaidTarget = createPaymentTargetFixture({
      scheduleItemId: 'schedule_unpaid',
      debtId: 'debt_unpaid',
      debtDescription: 'Unpaid website invoice',
      paymentState: 'unpaid',
    });
    const requestedPaymentStates: Array<string | null> = [];

    server.use(
      http.get(`${getBackendUrl()}/customers/:customerId/payment-targets`, ({ request }) => {
        const paymentState = new URL(request.url).searchParams.get('paymentState');
        requestedPaymentStates.push(paymentState);

        return HttpResponse.json({
          items: paymentState === 'unpaid' ? [unpaidTarget] : initialTargets,
          page: 1,
          pageSize: 10,
          totalItems: paymentState === 'unpaid' ? 1 : 6,
          totalPages: 1,
        });
      }),
    );

    renderWithAppProviders(
      <PaymentDrawer
        customerId="customer_123"
        onClose={vi.fn()}
        onSubmit={async () => undefined}
      />,
    );

    const drawer = screen.getByRole('dialog', { name: 'Record payment' });
    const paymentStatus = await within(drawer).findByRole('combobox', {
      name: 'Payment status',
    });

    await user.selectOptions(paymentStatus, 'unpaid');

    expect(
      await within(drawer).findByRole('button', { name: /Unpaid website invoice/ }),
    ).toBeInTheDocument();
    expect(requestedPaymentStates).toContain('unpaid');
    expect(
      within(drawer).getByRole('searchbox', { name: 'Search debt descriptions' }),
    ).toBeInTheDocument();
    expect(within(drawer).getByRole('combobox', { name: 'Payment status' })).toHaveValue('unpaid');
    expect(within(drawer).queryByLabelText('Payment amount')).not.toBeInTheDocument();
  });

  it('moves through large-picker pages', async () => {
    const user = userEvent.setup();
    const firstPageTargets = Array.from({ length: 10 }, (_, index) =>
      createPaymentTargetFixture({
        scheduleItemId: `schedule_${index + 1}`,
        debtId: `debt_${index + 1}`,
        debtDescription: `Debt ${index + 1}`,
        plan: { type: 'installment', position: index + 1 },
      }),
    );
    const secondPageTarget = createPaymentTargetFixture({
      scheduleItemId: 'schedule_11',
      debtId: 'debt_11',
      debtDescription: 'Debt 11',
      plan: { type: 'installment', position: 11 },
    });
    const requestedPages: string[] = [];

    server.use(
      http.get(`${getBackendUrl()}/customers/:customerId/payment-targets`, ({ request }) => {
        const page = new URL(request.url).searchParams.get('page') ?? '1';
        requestedPages.push(page);

        return HttpResponse.json({
          items: page === '2' ? [secondPageTarget] : firstPageTargets,
          page: Number(page),
          pageSize: 10,
          totalItems: 11,
          totalPages: 2,
        });
      }),
    );

    renderWithAppProviders(
      <PaymentDrawer
        customerId="customer_123"
        onClose={vi.fn()}
        onSubmit={async () => undefined}
      />,
    );

    const drawer = screen.getByRole('dialog', { name: 'Record payment' });
    expect(await within(drawer).findByRole('heading', { name: 'Debt 1' })).toBeInTheDocument();
    const nextPage = within(drawer).getByRole('button', { name: 'Next page' });

    await user.click(nextPage);

    expect(await within(drawer).findByRole('button', { name: /Debt 11/ })).toBeInTheDocument();
    expect(requestedPages).toEqual(['1', '2']);
  });

  it('shows the selected target remaining and exact payment preview', async () => {
    const user = userEvent.setup();
    const target = createPaymentTargetFixture({
      amount: '60.00',
      remainingAmount: '45.05',
      plan: { type: 'installment', position: 1 },
    });

    renderPaymentDrawer(target);

    const drawer = screen.getByRole('dialog', { name: 'Record payment' });
    expect(within(drawer).getByText('$45.05')).toBeInTheDocument();
    expect(within(drawer).queryByText('Debt remaining')).not.toBeInTheDocument();
    expect(within(drawer).getByLabelText('Payment amount')).toHaveFocus();
    expect(within(drawer).getByLabelText('Payment amount')).toHaveValue('');

    await user.type(within(drawer).getByLabelText('Payment amount'), '12.30');

    expect(within(drawer).getByText('$32.75')).toBeInTheDocument();
    expect(within(drawer).queryByText('Debt remaining after payment')).not.toBeInTheDocument();
  });

  it("fills the selected target's remaining amount without submitting", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn(async () => undefined);
    const target = createPaymentTargetFixture({
      amount: '60.00',
      remainingAmount: '45.05',
      plan: { type: 'installment', position: 1 },
    });

    renderPaymentDrawer(target, onSubmit);
    const drawer = screen.getByRole('dialog', { name: 'Record payment' });

    await user.click(within(drawer).getByRole('button', { name: 'Pay full remaining amount' }));

    expect(within(drawer).getByLabelText('Payment amount')).toHaveValue('45.05');
    expect(within(drawer).getByText('$0.00')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits the selected target and current debt version', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn(async () => undefined);
    const target = createPaymentTargetFixture({
      remainingAmount: '74.80',
      debtVersion: 7,
    });

    renderPaymentDrawer(target, onSubmit);
    const drawer = screen.getByRole('dialog', { name: 'Record payment' });

    await user.type(within(drawer).getByLabelText('Payment amount'), '25.20');
    await user.type(within(drawer).getByLabelText('Note (optional)'), 'cash');
    await user.click(within(drawer).getByRole('button', { name: 'Record payment' }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: '25.20',
          expectedDebtVersion: 7,
          note: 'cash',
          paymentDate: expect.any(String),
          targetScheduleItemId: target.scheduleItemId,
        }),
      ),
    );
  });

  it('rejects an amount above the selected target and a future payment date before submit', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn(async () => undefined);
    const target = createPaymentTargetFixture({
      scheduleItemId: 'schedule_123',
      remainingAmount: '40.00',
      dueDate: '2026-10-30',
      timing: 'upcoming',
    });

    renderPaymentDrawer(target, onSubmit);
    const drawer = screen.getByRole('dialog', { name: 'Record payment' });
    await user.type(within(drawer).getByLabelText('Payment amount'), '40.01');
    await user.clear(within(drawer).getByLabelText('Payment date'));
    await user.type(within(drawer).getByLabelText('Payment date'), '9999-01-01');
    await user.click(within(drawer).getByRole('button', { name: 'Record payment' }));

    expect(
      within(drawer).getByText('Payment exceeds the target remaining amount.'),
    ).toBeInTheDocument();
    expect(within(drawer).getByText('Payment date cannot be in the future.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits a payment dated before the current business date', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn(async () => undefined);

    renderPaymentDrawer(createPaymentTargetFixture(), onSubmit);
    const drawer = screen.getByRole('dialog', { name: 'Record payment' });
    await user.type(within(drawer).getByLabelText('Payment amount'), '10');
    await user.clear(within(drawer).getByLabelText('Payment date'));
    await user.type(within(drawer).getByLabelText('Payment date'), '2000-01-01');
    await user.click(within(drawer).getByRole('button', { name: 'Record payment' }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ paymentDate: '2000-01-01' })),
    );
  });

  it('defaults the payment date to the Istanbul date on either side of midnight', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const target = createPaymentTargetFixture();

    vi.setSystemTime(new Date('2026-09-10T20:59:59Z'));
    const firstRender = renderPaymentDrawer(target);
    expect(screen.getByLabelText('Payment date')).toHaveValue('2026-09-10');

    firstRender.unmount();
    vi.setSystemTime(new Date('2026-09-10T21:00:00Z'));
    renderPaymentDrawer(target);
    expect(screen.getByLabelText('Payment date')).toHaveValue('2026-09-11');
  });

  it('allows only one submission while recording', async () => {
    const user = userEvent.setup();
    let resolveSubmit: (() => void) | undefined;
    const onSubmit = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveSubmit = resolve;
        }),
    );
    const onClose = vi.fn();

    renderPaymentDrawer(createPaymentTargetFixture(), onSubmit, onClose);
    const drawer = screen.getByRole('dialog', { name: 'Record payment' });
    await user.type(within(drawer).getByLabelText('Payment amount'), '10');
    await user.click(within(drawer).getByRole('button', { name: 'Record payment' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const amountInput = within(drawer).getByLabelText('Payment amount');
    await user.click(amountInput);
    await user.keyboard('{Enter}');

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(amountInput).toHaveValue('10');
    expect(within(drawer).getByRole('button', { name: 'Recording' })).toBeDisabled();
    expect(within(drawer).getByRole('button', { name: 'Close payment form' })).toBeDisabled();

    resolveSubmit?.();
    await waitFor(() =>
      expect(within(drawer).getByRole('button', { name: 'Record payment' })).toBeEnabled(),
    );
    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes with Escape and returns focus to the opening button', async () => {
    const user = userEvent.setup();
    const target = createPaymentTargetFixture();

    renderWithAppProviders(<PaymentDrawerHarness target={target} />);
    const openButton = screen.getByRole('button', { name: 'Open payment' });
    await user.click(openButton);

    expect(screen.getByRole('dialog', { name: 'Record payment' })).toBeInTheDocument();
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog', { name: 'Record payment' })).not.toBeInTheDocument();
    expect(openButton).toHaveFocus();
  });

  it('renders the payment drawer in Arabic right-to-left mode', () => {
    window.localStorage.setItem(localeStorageKey, 'ar');

    renderPaymentDrawer(createPaymentTargetFixture());

    expect(document.documentElement).toHaveAttribute('dir', 'rtl');
    expect(screen.getByRole('dialog', { name: 'تسجيل دفعة' })).toBeInTheDocument();
  });
});

function renderPaymentDrawer(
  target: PaymentTarget,
  onSubmit: ((request: PaymentSubmissionRequest) => Promise<void>) | undefined = async () =>
    undefined,
  onClose: () => void = vi.fn(),
) {
  return renderWithAppProviders(
    <PaymentDrawer
      customerId="customer_123"
      initialTarget={target}
      onClose={onClose}
      onSubmit={onSubmit}
    />,
  );
}

function PaymentDrawerHarness({ target }: { target: PaymentTarget }) {
  const [isOpen, setIsOpen] = useState(false);
  const openButtonRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <button ref={openButtonRef} onClick={() => setIsOpen(true)} type="button">
        Open payment
      </button>
      {isOpen ? (
        <PaymentDrawer
          customerId="customer_123"
          initialTarget={target}
          onClose={() => setIsOpen(false)}
          onSubmit={async () => undefined}
          returnFocusRef={openButtonRef}
        />
      ) : null}
    </>
  );
}
