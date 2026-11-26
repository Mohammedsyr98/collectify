import { describe, expect, it } from 'vitest';

import {
  paymentHistoryListResponseSchema,
  paymentHistoryPageSize,
  paymentHistoryQuerySchema,
} from './payment-history.js';

const validHistoryItem = {
  id: 'payment_history_1',
  scheduleItemId: 'schedule_history_1',
  debtId: 'debt_history_1',
  debtDescription: 'Office equipment',
  debtVersion: 4,
  amount: '25.00',
  maximumReplacementAmount: '100.00',
  deletionPreview: {
    remainingAmount: '75.00',
    targetPaymentState: 'unpaid',
  },
  currency: 'USD',
  paymentDate: '2026-10-20',
  note: 'Paid in cash',
  plan: {
    type: 'installment',
    position: 2,
    total: 4,
  },
} as const;

describe('payment history query contract', () => {
  it.each([
    ['the newest page', {}, {}],
    [
      'an older page',
      { cursor: 'opaque-history-cursor' },
      { cursor: 'opaque-history-cursor' },
    ],
  ])('accepts %s without exposing page offsets', (_description, input, expected) => {
    expect(paymentHistoryQuerySchema.parse(input)).toEqual(expected);
  });

  it('rejects offset pagination controls', () => {
    expect(paymentHistoryQuerySchema.safeParse({ page: 2 }).success).toBe(false);
    expect(paymentHistoryQuerySchema.safeParse({ offset: 10 }).success).toBe(false);
    expect(paymentHistoryQuerySchema.safeParse({ pageSize: 50 }).success).toBe(false);
  });
});

describe('payment history response contract', () => {
  it('accepts a page with current debt and plan context', () => {
    const response = {
      items: [validHistoryItem],
      pageSize: paymentHistoryPageSize,
      totalItems: 12,
      nextCursor: 'opaque-history-cursor',
    } as const;

    expect(paymentHistoryListResponseSchema.parse(response)).toEqual(response);
  });

  it('groups the projected remaining amount and target status under a deletion preview', () => {
    const response = {
      items: [
        {
          ...validHistoryItem,
          deletionPreview: {
            remainingAmount: '75.00',
            targetPaymentState: 'partiallyPaid' as const,
          },
        },
      ],
      pageSize: paymentHistoryPageSize,
      totalItems: 1,
      nextCursor: null,
    };

    expect(paymentHistoryListResponseSchema.parse(response)).toEqual(response);
  });

  it('rejects more than the fixed 10 history items', () => {
    const result = paymentHistoryListResponseSchema.safeParse({
      items: Array.from({ length: 11 }, () => validHistoryItem),
      pageSize: paymentHistoryPageSize,
      totalItems: 11,
      nextCursor: null,
    });

    expect(result.success).toBe(false);
  });
});
