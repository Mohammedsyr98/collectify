import '@testing-library/jest-dom/vitest';
import { cleanup, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
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
    const searchInput = await within(drawer).findByRole('searchbox', {
      name: 'Search debt descriptions',
    });
    expect(searchInput).toHaveFocus();
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
    ).toHaveFocus();
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
    server.use(
      http.get(`${getBackendUrl()}/customers/:customerId/payment-targets`, ({ request }) => {
        const page = new URL(request.url).searchParams.get('page') ?? '1';

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

    const secondPageButton = await within(drawer).findByRole('button', { name: /Debt 11/ });
    expect(secondPageButton).toHaveFocus();
    expect(within(drawer).getByRole('status')).toHaveTextContent(
      'Showing 11–11 of 11 payment targets',
    );
    expect(
      within(drawer).queryByRole('heading', { name: 'Debt 1' }),
    ).not.toBeInTheDocument();
  });
});
