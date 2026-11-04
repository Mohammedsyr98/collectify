import '@testing-library/jest-dom/vitest';
import { cleanup, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getBackendUrl } from '../../../shared/api/http';
import { renderWithAppProviders } from '../../../shared/test/render';
import { server } from '../../../shared/test/server';
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

  it('shows picker controls when multiple targets are available', async () => {
    const targets = Array.from({ length: 2 }, (_, index) =>
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
    const searchInput = await within(drawer).findByRole('searchbox', {
      name: 'Search debts',
    });
    expect(searchInput).toHaveFocus();
    expect(within(drawer).getByRole('group', { name: 'Payment status' })).toBeInTheDocument();
    expect(within(drawer).getByRole('button', { name: 'All targets' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(within(drawer).getAllByRole('button', { name: /Debt [1-2]/ })).toHaveLength(2);
  });

  it('keeps controls available when searching finds no targets', async () => {
    const user = userEvent.setup();
    const initialTargets = Array.from({ length: 6 }, (_, index) =>
      createPaymentTargetFixture({
        scheduleItemId: `schedule_${index + 1}`,
        debtId: `debt_${index + 1}`,
        debtDescription: `Debt ${index + 1}`,
        plan: { type: 'installment', position: index + 1 },
      }),
    );
    const requestedSearches: Array<string | null> = [];

    server.use(
      http.get(`${getBackendUrl()}/customers/:customerId/payment-targets`, ({ request }) => {
        const search = new URL(request.url).searchParams.get('search');
        requestedSearches.push(search);

        return HttpResponse.json({
          items: search ? [] : initialTargets,
          page: 1,
          pageSize: 10,
          totalItems: search ? 0 : 6,
          totalPages: search ? 0 : 1,
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
      name: 'Search debts',
    });

    await user.type(searchInput, 'website');

    await waitFor(() =>
      expect(within(drawer).getByRole('status')).toHaveTextContent(
        'No payment targets available.',
      ),
    );
    expect(requestedSearches).toContain('website');
    expect(
      within(drawer).getByRole('searchbox', { name: 'Search debts' }),
    ).toHaveFocus();
    expect(within(drawer).getByRole('group', { name: 'Payment status' })).toBeInTheDocument();
    expect(within(drawer).queryByLabelText('Payment amount')).not.toBeInTheDocument();
  });

  it('filters payment targets by payment status', async () => {
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
    const unpaidFilter = await within(drawer).findByRole('button', { name: 'Unpaid' });

    await user.click(unpaidFilter);

    expect(
      await within(drawer).findByRole('button', { name: /Unpaid website invoice/ }),
    ).toBeInTheDocument();
    expect(requestedPaymentStates).toContain('unpaid');
    expect(
      within(drawer).getByRole('searchbox', { name: 'Search debts' }),
    ).toBeInTheDocument();
    expect(within(drawer).getByRole('button', { name: 'Unpaid' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(within(drawer).queryByLabelText('Payment amount')).not.toBeInTheDocument();
  });

  it('shows cached filter results while refreshing them in the background', async () => {
    const user = userEvent.setup();
    const initialTargets = Array.from({ length: 6 }, (_, index) =>
      createPaymentTargetFixture({
        scheduleItemId: `schedule_${index + 1}`,
        debtId: `debt_${index + 1}`,
        debtDescription: `Debt ${index + 1}`,
      }),
    );
    const unpaidTarget = createPaymentTargetFixture({
      scheduleItemId: 'schedule_unpaid',
      debtId: 'debt_unpaid',
      debtDescription: 'Unpaid website invoice',
      paymentState: 'unpaid',
    });
    let allTargetsRequestCount = 0;

    server.use(
      http.get(`${getBackendUrl()}/customers/:customerId/payment-targets`, async ({ request }) => {
        const paymentState = new URL(request.url).searchParams.get('paymentState');

        if (paymentState === 'unpaid') {
          return HttpResponse.json({
            items: [unpaidTarget],
            page: 1,
            pageSize: 10,
            totalItems: 1,
            totalPages: 1,
          });
        }

        allTargetsRequestCount += 1;
        if (allTargetsRequestCount > 1) {
          await delay(500);
        }

        return HttpResponse.json({
          items: initialTargets,
          page: 1,
          pageSize: 10,
          totalItems: 6,
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
    expect(await within(drawer).findByRole('button', { name: /Debt 1/ })).toBeInTheDocument();

    await user.click(within(drawer).getByRole('button', { name: 'Unpaid' }));
    expect(
      await within(drawer).findByRole('button', { name: /Unpaid website invoice/ }),
    ).toBeInTheDocument();

    await user.click(within(drawer).getByRole('button', { name: 'All targets' }));

    expect(within(drawer).getByRole('button', { name: /Debt 1/ })).toBeInTheDocument();
    expect(
      within(drawer).queryByRole('status', { name: 'Loading payment targets' }),
    ).not.toBeInTheDocument();
    expect(allTargetsRequestCount).toBe(2);
  });

  it('moves focus to Retry and restores it to the selected filter', async () => {
    const user = userEvent.setup();
    const initialTargets = Array.from({ length: 6 }, (_, index) =>
      createPaymentTargetFixture({
        scheduleItemId: `schedule_${index + 1}`,
        debtId: `debt_${index + 1}`,
        debtDescription: `Debt ${index + 1}`,
      }),
    );
    const recoveredTarget = createPaymentTargetFixture({
      scheduleItemId: 'schedule_recovered',
      debtId: 'debt_recovered',
      debtDescription: 'Recovered unpaid debt',
      paymentState: 'unpaid',
    });
    let filteredRequestCount = 0;

    server.use(
      http.get(`${getBackendUrl()}/customers/:customerId/payment-targets`, async ({ request }) => {
        const paymentState = new URL(request.url).searchParams.get('paymentState');

        if (paymentState !== 'unpaid') {
          return HttpResponse.json({
            items: initialTargets,
            page: 1,
            pageSize: 10,
            totalItems: 6,
            totalPages: 1,
          });
        }

        filteredRequestCount += 1;
        if (filteredRequestCount === 1) {
          return HttpResponse.text('Internal server error', { status: 500 });
        }

        await delay(100);
        return HttpResponse.json({
          items: [recoveredTarget],
          page: 1,
          pageSize: 10,
          totalItems: 1,
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
    const unpaidFilter = await within(drawer).findByRole('button', { name: 'Unpaid' });
    await user.click(unpaidFilter);

    const errorState = await within(drawer).findByRole('alert', {
      name: 'Couldn’t load payment targets',
    });
    expect(errorState).not.toHaveTextContent('Something went wrong.');
    expect(
      within(drawer).getByRole('searchbox', { name: 'Search debts' }),
    ).toBeInTheDocument();
    expect(within(drawer).getByRole('button', { name: 'Unpaid' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(within(errorState).getByRole('button', { name: 'Try again' })).toHaveFocus();

    await user.click(within(errorState).getByRole('button', { name: 'Try again' }));

    expect(within(drawer).queryByRole('alert')).not.toBeInTheDocument();
    expect(
      within(drawer).getByRole('status', { name: 'Loading payment targets' }),
    ).toBeInTheDocument();
    await waitFor(() => expect(unpaidFilter).toHaveFocus());
    expect(
      await within(drawer).findByRole('button', { name: /Recovered unpaid debt/ }),
    ).toBeInTheDocument();
  }, 15_000);

  it('preserves Next page focus across a page request', async () => {
    const user = userEvent.setup();
    const createPageTargets = (firstPosition: number) =>
      Array.from({ length: 10 }, (_, index) => {
        const position = firstPosition + index;
        return createPaymentTargetFixture({
          scheduleItemId: `schedule_${position}`,
          debtId: `debt_${position}`,
          debtDescription: `Debt ${position}`,
          plan: { type: 'installment', position },
        });
      });
    const firstPageTargets = createPageTargets(1);
    const secondPageTargets = createPageTargets(11);
    server.use(
      http.get(`${getBackendUrl()}/customers/:customerId/payment-targets`, async ({ request }) => {
        const page = new URL(request.url).searchParams.get('page') ?? '1';
        if (page === '2') await delay(100);

        return HttpResponse.json({
          items: page === '2' ? secondPageTargets : firstPageTargets,
          page: Number(page),
          pageSize: 10,
          totalItems: 21,
          totalPages: 3,
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

    expect(
      await within(drawer).findByRole('status', { name: 'Loading payment targets' }),
    ).toBeInTheDocument();
    const nextPageWhileLoading = within(drawer).getByRole('button', { name: 'Next page' });
    expect(nextPageWhileLoading).toHaveFocus();
    expect(nextPageWhileLoading).toHaveAttribute('aria-disabled', 'true');

    expect(await within(drawer).findByRole('button', { name: /Debt 11/ })).toBeInTheDocument();
    expect(within(drawer).getByRole('button', { name: 'Next page' })).toHaveFocus();
    expect(within(drawer).getByRole('status')).toHaveTextContent(
      '11–20 of 21 targets',
    );
    expect(
      within(drawer).queryByRole('heading', { name: 'Debt 1' }),
    ).not.toBeInTheDocument();
  });
});
