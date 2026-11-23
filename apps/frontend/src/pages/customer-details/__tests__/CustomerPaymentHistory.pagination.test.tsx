import '@testing-library/jest-dom/vitest';
import { cleanup, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type {
  PaymentHistoryItem,
  PaymentHistoryListResponse,
} from '@collectify/contracts';

import { getBackendUrl } from '@/shared/api';

import { baseCustomer, resetCustomerTestEnvironment } from './customerDetailsTestData';
import { emptyDebtList } from './debtTestData';
import { renderCustomerRoutes } from './renderCustomerRoutes';
import { server } from './render';

describe('CustomerPaymentHistory pagination', () => {
  beforeEach(() => {
    resetCustomerTestEnvironment();
    server.use(
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
  });

  it('appends the page addressed by the opaque cursor and keeps the completed action focused', async () => {
    const user = userEvent.setup();
    const requestedCursors: Array<string | null> = [];
    const firstItems = Array.from({ length: 10 }, (_, index) =>
      createHistoryItem(index + 1),
    );
    const olderItems = [createHistoryItem(11), createHistoryItem(12)];

    server.use(
      http.get(`${getBackendUrl()}/customers/:customerId/payments`, ({ request }) => {
        const cursor = new URL(request.url).searchParams.get('cursor');
        requestedCursors.push(cursor);

        return HttpResponse.json(
          cursor
            ? ({
                items: olderItems,
                pageSize: 10,
                totalItems: 13,
                nextCursor: null,
              } satisfies PaymentHistoryListResponse)
            : ({
                items: firstItems,
                pageSize: 10,
                totalItems: 12,
                nextCursor: 'cursor-after-10',
              } satisfies PaymentHistoryListResponse),
        );
      }),
    );

    renderCustomerRoutes([`/customers/${baseCustomer.id}`]);

    const payments = await screen.findByRole('region', { name: 'Payments' });
    expect(await within(payments).findAllByRole('listitem')).toHaveLength(10);
    expect(payments).toHaveTextContent('Showing 10 of 12');

    const loadOlderButton = within(payments).getByRole('button', {
      name: 'Load 10 older payments',
    });

    await user.click(loadOlderButton);

    await waitFor(() => {
      expect(within(payments).getAllByRole('listitem')).toHaveLength(12);
    });
    expect(requestedCursors).toEqual([null, 'cursor-after-10']);
    expect(payments).toHaveTextContent('Showing 12 of 12');
    expect(loadOlderButton).toHaveAccessibleName('All payments loaded');
    expect(loadOlderButton).toHaveAttribute('aria-disabled', 'true');
    expect(document.activeElement).toBe(loadOlderButton);
  });

  it('keeps loaded rows and retries the same cursor after an older-page failure', async () => {
    const user = userEvent.setup();
    const requestedCursors: Array<string | null> = [];
    let olderRequestCount = 0;

    server.use(
      http.get(`${getBackendUrl()}/customers/:customerId/payments`, ({ request }) => {
        const cursor = new URL(request.url).searchParams.get('cursor');
        requestedCursors.push(cursor);

        if (!cursor) {
          return HttpResponse.json({
            items: [createHistoryItem(1)],
            pageSize: 10,
            totalItems: 2,
            nextCursor: 'cursor-after-first',
          } satisfies PaymentHistoryListResponse);
        }

        olderRequestCount += 1;
        if (olderRequestCount === 1) {
          return HttpResponse.text('Internal server error', { status: 500 });
        }

        return HttpResponse.json({
          items: [createHistoryItem(2)],
          pageSize: 10,
          totalItems: 2,
          nextCursor: null,
        } satisfies PaymentHistoryListResponse);
      }),
    );

    renderCustomerRoutes([`/customers/${baseCustomer.id}`]);

    const payments = await screen.findByRole('region', { name: 'Payments' });
    expect(await within(payments).findAllByRole('listitem')).toHaveLength(1);

    await user.click(
      within(payments).getByRole('button', {
        name: 'Load 10 older payments',
      }),
    );

    const appendError = await within(payments).findByRole('alert');
    expect(appendError).toHaveTextContent('Could not load older payments.');
    expect(within(payments).getAllByRole('listitem')).toHaveLength(1);

    await user.click(within(appendError).getByRole('button', { name: 'Try again' }));

    await waitFor(() => {
      expect(within(payments).getAllByRole('listitem')).toHaveLength(2);
    });
    expect(requestedCursors).toEqual([
      null,
      'cursor-after-first',
      'cursor-after-first',
    ]);
    expect(within(payments).queryByRole('alert')).not.toBeInTheDocument();
  });
});

function createHistoryItem(sequence: number): PaymentHistoryItem {
  return {
    id: `payment_history_${sequence}`,
    scheduleItemId: `schedule_history_${sequence}`,
    debtId: `debt_history_${sequence}`,
    debtDescription: `Payment debt ${sequence}`,
    debtVersion: 1,
    amount: `${sequence}.00`,
    maximumReplacementAmount: '100.00',
    currency: 'USD',
    paymentDate: '2026-10-20',
    note: null,
    plan: { type: 'onePayment' },
  };
}
