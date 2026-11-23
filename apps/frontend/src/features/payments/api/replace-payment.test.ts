import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import type { ReplacePaymentRequest, ReplacePaymentResponse } from '@collectify/contracts';

import { getBackendUrl } from '@/shared/api';
import { server } from '@/shared/test';
import { replacePayment } from './replace-payment';

describe('replace payment API', () => {
  it('sends only editable fields and the source debt version to the payment route', async () => {
    const request: ReplacePaymentRequest = {
      amount: '35.00',
      paymentDate: '2026-10-21',
      note: null,
      expectedSourceDebtVersion: 4,
    };
    const response: ReplacePaymentResponse = {
      payment: {
        id: 'payment_123',
        scheduleItemId: 'schedule_123',
        amount: '35.00',
        paymentDate: '2026-10-21',
        note: null,
        idempotencyKey: '10000000-0000-4000-8000-000000000001',
        createdAt: '2026-10-20T07:00:00.000Z',
        updatedAt: '2026-10-21T07:00:00.000Z',
      },
    };
    let received: unknown;

    server.use(
      http.put(
        `${getBackendUrl()}/customers/:customerId/payments/:paymentId`,
        async ({ params, request: httpRequest }) => {
          expect(params.customerId).toBe('customer_123');
          expect(params.paymentId).toBe('payment_123');
          received = await httpRequest.json();
          return HttpResponse.json(response);
        },
      ),
    );

    await expect(replacePayment('customer_123', 'payment_123', request)).resolves.toEqual(response);
    expect(received).toEqual(request);
  });
});
