import { describe, expect, it } from 'vitest';

import {
  calculateScheduleItemPaymentState,
  scheduleItemPaymentIssueCode,
} from './index.js';

describe('schedule-item payment state', () => {
  it('derives an unpaid state when no payment facts exist', () => {
    expect(
      calculateScheduleItemPaymentState({
        scheduledAmount: '100.00',
        paymentAmounts: [],
      }),
    ).toEqual({
      success: true,
      state: {
        paidAmount: '0.00',
        remainingAmount: '100.00',
        paymentState: 'unpaid',
      },
    });
  });

  it('calculates an exact partially paid state from multiple payments', () => {
    expect(
      calculateScheduleItemPaymentState({
        scheduledAmount: '100.00',
        paymentAmounts: ['40.00', '0.20'],
      }),
    ).toEqual({
        success: true,
        state: {
          paidAmount: '40.20',
          remainingAmount: '59.80',
          paymentState: 'partiallyPaid',
        },
      });
  });

  it('derives a paid state when payment facts equal the target amount', () => {
    expect(
      calculateScheduleItemPaymentState({
        scheduledAmount: '100.00',
        paymentAmounts: ['40.00', '60.00'],
      }),
    ).toEqual({
      success: true,
      state: {
        paidAmount: '100.00',
        remainingAmount: '0.00',
        paymentState: 'paid',
      },
    });
  });

  it('rejects payment facts that exceed the schedule item amount', () => {
    expect(
      calculateScheduleItemPaymentState({
        scheduledAmount: '100.00',
        paymentAmounts: ['100.01'],
      }),
    ).toEqual({
        success: false,
        issue: scheduleItemPaymentIssueCode.paymentAmountExceedsAvailableBalance,
      });
  });
});
