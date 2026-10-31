import { describe, expect, it } from 'vitest';

import { paymentIssueCode, validatePayment } from './index.js';

describe('validatePayment', () => {
  it('accepts a payment at the remaining amount on the business date', () => {
    expect(
      validatePayment({
        amount: '40.00',
        remainingAmount: '40.00',
        paymentDate: '2026-10-31',
        businessDate: '2026-10-31',
      }),
    ).toEqual({ success: true });
  });

  it('reports existing issue codes with their payment-form targets', () => {
    expect(
      validatePayment({
        amount: '40.01',
        remainingAmount: '40.00',
        paymentDate: '2026-11-01',
        businessDate: '2026-10-31',
      }),
    ).toEqual({
      success: false,
      issues: [
        { code: paymentIssueCode.paymentDateInFuture, target: 'paymentDate' },
        {
          code: paymentIssueCode.paymentAmountExceedsRemaining,
          target: 'amount',
        },
      ],
    });
  });
});
