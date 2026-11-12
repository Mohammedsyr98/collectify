import '@testing-library/jest-dom/vitest';
import { cleanup, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { paymentApiErrorCode } from '@collectify/contracts';

import { getBackendUrl } from '@/shared/api';
import { sharedLocalizationResources } from '@/shared/localization';
import { renderWithAppProviders } from './render';
import { server } from '@/shared/test';
import { PaymentDrawer } from '../ui/editor/PaymentDrawer';
import { paymentResources } from '../localization/resources';
import { renderPaymentDrawer } from './paymentDrawerTestUtils';
import { createPaymentTargetFixture } from './paymentTestData';

const paymentMessages = paymentResources.en.common.payments;
const retryLabel = sharedLocalizationResources.en.common.errors.retry;
const installmentLabel = (position: number) =>
  paymentMessages.drawer.installmentLabel.replace('{{position}}', String(position));

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
    const drawer = screen.getByRole('dialog', { name: paymentMessages.drawer.title });
    const changeTarget = await within(drawer).findByRole('button', {
      name: paymentMessages.drawer.changeTarget,
    });

    expect(targetListRequestCount).toBe(0);

    await user.click(changeTarget);

    expect(
      await within(drawer).findByRole('heading', {
        name: paymentMessages.drawer.chooseTargetTitle,
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

    const drawer = screen.getByRole('dialog', { name: paymentMessages.drawer.title });
    const amount = within(drawer).getByLabelText(paymentMessages.drawer.amountLabel);
    const paymentDate = within(drawer).getByLabelText(paymentMessages.drawer.dateLabel);
    const note = within(drawer).getByLabelText(paymentMessages.drawer.noteLabel);

    await user.type(amount, '25.00');
    await user.clear(paymentDate);
    await user.type(paymentDate, '2026-10-01');
    await user.type(note, 'keep');
    await user.click(
      within(drawer).getByRole('button', { name: paymentMessages.drawer.changeTarget }),
    );
    await user.click(await within(drawer).findByRole('button', { name: /Replacement equipment/ }));

    expect(within(drawer).getByLabelText(paymentMessages.drawer.amountLabel)).toHaveValue('25.00');
    expect(within(drawer).getByLabelText(paymentMessages.drawer.dateLabel)).toHaveValue('2026-10-01');
    expect(within(drawer).getByLabelText(paymentMessages.drawer.noteLabel)).toHaveValue('keep');

    await user.click(
      within(drawer).getByRole('button', { name: paymentMessages.drawer.submit }),
    );

    expect(
      within(drawer).getByText(
        paymentMessages.errors[paymentApiErrorCode.paymentAmountExceedsRemaining],
      ),
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

    const drawer = screen.getByRole('dialog', { name: paymentMessages.drawer.title });
    const amount = within(drawer).getByLabelText(paymentMessages.drawer.amountLabel);
    const paymentDate = within(drawer).getByLabelText(paymentMessages.drawer.dateLabel);
    const note = within(drawer).getByLabelText(paymentMessages.drawer.noteLabel);

    await user.type(amount, '25.00');
    await user.clear(paymentDate);
    await user.type(paymentDate, '2026-10-01');
    await user.type(note, 'keep this note');
    await user.click(
      within(drawer).getByRole('button', { name: paymentMessages.drawer.changeTarget }),
    );
    await user.click(
      await within(drawer).findByRole('button', { name: /European office expense/ }),
    );

    expect(within(drawer).getByLabelText(paymentMessages.drawer.amountLabel)).toHaveValue('');
    expect(within(drawer).getByLabelText(paymentMessages.drawer.dateLabel)).toHaveValue('2026-10-01');
    expect(within(drawer).getByLabelText(paymentMessages.drawer.noteLabel)).toHaveValue('keep this note');
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

    const drawer = screen.getByRole('dialog', { name: paymentMessages.drawer.title });
    expect(
      within(drawer).getByRole('heading', { name: paymentMessages.drawer.chooseTargetTitle }),
    ).toBeInTheDocument();
    expect(
      await within(drawer).findByRole('status', {
        name: paymentMessages.drawer.loadingTargets,
      }),
    ).toBeInTheDocument();
    expect(
      within(drawer).queryByLabelText(paymentMessages.drawer.amountLabel),
    ).not.toBeInTheDocument();
  });

  it('announces when no payment targets are available', async () => {
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

    const drawer = screen.getByRole('dialog', { name: paymentMessages.drawer.title });
    await waitFor(() =>
      expect(within(drawer).getByRole('status')).toHaveTextContent(
        paymentMessages.drawer.noTargets,
      ),
    );
    expect(
      within(drawer).queryByRole('status', { name: paymentMessages.drawer.loadingTargets }),
    ).not.toBeInTheDocument();
    expect(
      within(drawer).queryByRole('searchbox', {
        name: paymentMessages.drawer.searchDebtDescriptions,
      }),
    ).not.toBeInTheDocument();
    expect(
      within(drawer).queryByRole('group', { name: paymentMessages.drawer.paymentStatus }),
    ).not.toBeInTheDocument();
    expect(
      within(drawer).queryByLabelText(paymentMessages.drawer.amountLabel),
    ).not.toBeInTheDocument();
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
      http.get(`${getBackendUrl()}/customers/:customerId/payment-targets`, async () => {
        requestCount += 1;

        if (requestCount === 1) {
          return HttpResponse.text('Internal server error', { status: 500 });
        }

        await delay(100);

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

    const drawer = screen.getByRole('dialog', { name: paymentMessages.drawer.title });
    const errorState = await within(drawer).findByRole('alert', {
      name: paymentMessages.drawer.targetLoadErrorTitle,
    });
    expect(errorState).not.toHaveTextContent('Something went wrong.');

    await user.click(within(errorState).getByRole('button', { name: retryLabel }));

    expect(within(drawer).queryByRole('alert')).not.toBeInTheDocument();
    expect(
      within(drawer).getByRole('status', { name: paymentMessages.drawer.loadingTargets }),
    ).toBeInTheDocument();

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

    const drawer = screen.getByRole('dialog', { name: paymentMessages.drawer.title });
    const amountInput = await within(drawer).findByLabelText(paymentMessages.drawer.amountLabel);
    await waitFor(() => expect(amountInput).toHaveFocus());
    expect(within(drawer).getByText('$42.50')).toBeInTheDocument();
  });

  it('shows the full picker for a small target list and opens the form after selection', async () => {
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

    const drawer = screen.getByRole('dialog', { name: paymentMessages.drawer.title });
    const search = await within(drawer).findByRole('searchbox', {
      name: paymentMessages.drawer.searchDebtDescriptions,
    });
    expect(search).toHaveFocus();
    expect(
      within(drawer).getByRole('group', { name: paymentMessages.drawer.paymentStatus }),
    ).toBeInTheDocument();
    expect(
      within(drawer).getByRole('button', { name: paymentMessages.drawer.allTargets }),
    ).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(within(drawer).getByRole('button', { name: /Office equipment/ })).toBeInTheDocument();
    const rentTargetButton = within(drawer).getByRole('button', { name: /Warehouse rent/ });
    expect(
      within(drawer).queryByLabelText(paymentMessages.drawer.amountLabel),
    ).not.toBeInTheDocument();

    await user.click(rentTargetButton);

    const amountInput = await within(drawer).findByLabelText(paymentMessages.drawer.amountLabel);
    await waitFor(() => expect(amountInput).toHaveFocus());
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

    const drawer = screen.getByRole('dialog', { name: paymentMessages.drawer.title });
    const firstRow = await within(drawer).findByRole('button', {
      name: new RegExp(installmentLabel(1)),
    });
    const secondRow = within(drawer).getByRole('button', {
      name: new RegExp(installmentLabel(2)),
    });

    expect(firstRow).toHaveAccessibleName(
      new RegExp(`Website redesign, ${installmentLabel(1)}`),
    );
    expect(firstRow).toHaveTextContent('October 1, 2026');
    expect(firstRow).toHaveTextContent(paymentMessages.drawer.timingOverdue);
    expect(firstRow).toHaveTextContent(paymentMessages.drawer.paymentStatePartiallyPaid);
    expect(firstRow).toHaveTextContent('$20.00');
    expect(secondRow).toHaveAccessibleName(
      new RegExp(`Website redesign, ${installmentLabel(2)}`),
    );
    expect(secondRow).toHaveTextContent('November 1, 2026');
    expect(secondRow).toHaveTextContent(paymentMessages.drawer.timingUpcoming);
    expect(secondRow).toHaveTextContent(paymentMessages.drawer.paymentStateUnpaid);
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

    const drawer = screen.getByRole('dialog', { name: paymentMessages.drawer.title });
    const websiteGroup = await within(drawer).findByRole('group', {
      name: 'Website redesign',
    });

    expect(within(drawer).getAllByRole('heading', { name: 'Website redesign' })).toHaveLength(1);
    expect(within(websiteGroup).getAllByRole('button')).toHaveLength(2);
    expect(
      within(websiteGroup).getByRole('button', {
        name: new RegExp(`Website redesign.*${installmentLabel(1)}`),
      }),
    ).toBeInTheDocument();
    expect(
      within(websiteGroup).getByRole('button', {
        name: new RegExp(`Website redesign.*${installmentLabel(2)}`),
      }),
    ).toBeInTheDocument();
    expect(within(drawer).getByRole('group', { name: 'Office equipment' })).toBeInTheDocument();

    await user.click(
      within(websiteGroup).getByRole('button', {
        name: new RegExp(`Website redesign.*${installmentLabel(1)}`),
      }),
    );

    expect(
      await within(drawer).findByLabelText(paymentMessages.drawer.amountLabel),
    ).toBeInTheDocument();
  });
});
