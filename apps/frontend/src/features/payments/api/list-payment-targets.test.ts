import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import type { PaymentTargetListResponse } from '@collectify/contracts';

import { getBackendUrl } from '@/shared/api';
import { server } from '@/shared/test';
import { listPaymentTargets } from './list-payment-targets';

describe('payment-target API', () => {
  it('requests the selected customer page, search, and payment state', async () => {
    const response: PaymentTargetListResponse = {
      items: [
        {
          scheduleItemId: 'schedule_item_123',
          debtId: 'debt_123',
          debtDescription: 'Office chairs',
          currency: 'USD',
          debtVersion: 3,
          amount: '125.00',
          remainingAmount: '75.00',
          dueDate: '2026-11-10',
          timing: 'upcoming',
          paymentState: 'partiallyPaid',
          plan: { type: 'installment', position: 2 },
        },
      ],
      page: 2,
      pageSize: 10,
      totalItems: 11,
      totalPages: 2,
    };
    const requests: Array<{
      customerId: string;
      page: string | null;
      pageSize: string | null;
      paymentState: string | null;
      search: string | null;
    }> = [];

    server.use(
      http.get(
        `${getBackendUrl()}/customers/:customerId/payment-targets`,
        ({ params, request }) => {
          const searchParams = new URL(request.url).searchParams;
          requests.push({
            customerId: String(params.customerId),
            page: searchParams.get('page'),
            pageSize: searchParams.get('pageSize'),
            paymentState: searchParams.get('paymentState'),
            search: searchParams.get('search'),
          });

          return HttpResponse.json(response);
        },
      ),
    );

    await expect(
      listPaymentTargets('customer_123', {
        page: 2,
        paymentState: 'partiallyPaid',
        search: 'Office chairs',
      }),
    ).resolves.toEqual(response);
    expect(requests).toEqual([
      {
        customerId: 'customer_123',
        page: '2',
        pageSize: null,
        paymentState: 'partiallyPaid',
        search: 'Office chairs',
      },
    ]);
  });
});
