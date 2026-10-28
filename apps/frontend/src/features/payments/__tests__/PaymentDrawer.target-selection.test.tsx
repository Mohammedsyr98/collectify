import '@testing-library/jest-dom/vitest';
import { cleanup, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getBackendUrl } from '../../../shared/api/http';
import { renderWithAppProviders } from '../../../shared/test/render';
import { server } from '../../../shared/test/server';
import { PaymentDrawer } from '../editor/PaymentDrawer';
import { renderPaymentDrawer } from './paymentDrawerTestUtils';
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
    await user.type(note, 'keep');
    await user.click(within(drawer).getByRole('button', { name: 'Change target' }));
    await user.click(await within(drawer).findByRole('button', { name: /Replacement equipment/ }));

    expect(within(drawer).getByLabelText('Payment amount')).toHaveValue('25.00');
    expect(within(drawer).getByLabelText('Payment date')).toHaveValue('2026-10-01');
    expect(within(drawer).getByLabelText('Note (optional)')).toHaveValue('keep');

    await user.click(within(drawer).getByRole('button', { name: 'Record payment' }));

    expect(
      within(drawer).getByText('Payment exceeds the target remaining amount.'),
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  }, 10_000);

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

  it('shows a retryable error when payment targets cannot be loaded', async () => {
    const user = userEvent.setup();
    let requestCount = 0;
    const recoveredTarget = createPaymentTargetFixture({
      debtDescription: 'Recovered target',
    });
    const secondRecoveredTarget = createPaymentTargetFixture({
      debtDescription: 'Another recovered target',
      scheduleItemId: 'schedule_recovered_2',
    });

    server.use(
      http.get(`${getBackendUrl()}/customers/:customerId/payment-targets`, () => {
        requestCount += 1;

        if (requestCount === 1) {
          return HttpResponse.text('Internal server error', { status: 500 });
        }

        return HttpResponse.json({
          items: [recoveredTarget, secondRecoveredTarget],
          page: 1,
          pageSize: 10,
          totalItems: 2,
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
    const errorState = await within(drawer).findByRole('alert', {
      name: 'Could not load payment targets',
    });
    expect(errorState).toHaveTextContent('Something went wrong. Try again.');

    await user.click(within(errorState).getByRole('button', { name: 'Try again' }));

    expect(
      await within(drawer).findByRole('button', { name: /Recovered target/ }),
    ).toBeInTheDocument();
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
    expect(await within(drawer).findByLabelText('Payment amount')).toHaveFocus();
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
    const firstTarget = await within(drawer).findByRole('button', { name: /Office equipment/ });
    expect(firstTarget).toHaveFocus();
    const rentTargetButton = within(drawer).getByRole('button', { name: /Warehouse rent/ });
    expect(within(drawer).queryByLabelText('Payment amount')).not.toBeInTheDocument();

    await user.click(rentTargetButton);

    const amountInput = await within(drawer).findByLabelText('Payment amount');
    expect(amountInput).toHaveFocus();
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
});
