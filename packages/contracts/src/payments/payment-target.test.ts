import { describe, expect, it } from 'vitest';

import {
  eligiblePaymentStateSchema,
  paymentTargetListResponseSchema,
  paymentTargetPageSize,
  paymentTargetQuerySchema,
  paymentTargetSchema,
} from './payment-target.js';
import { paymentStateSchema } from '../debts/debt.js';

const validOnePaymentTarget = {
  scheduleItemId: 'schedule_target_one_payment',
  debtId: 'debt_target_one_payment',
  debtDescription: 'Website redesign',
  currency: 'USD',
  debtVersion: 3,
  debtRemainingAmount: '100.00',
  amount: '125.50',
  remainingAmount: '100.00',
  dueDate: '2026-10-30',
  timing: 'upcoming',
  paymentState: 'partiallyPaid',
  plan: { type: 'onePayment' },
} as const;

const validInstallmentTarget = {
  ...validOnePaymentTarget,
  scheduleItemId: 'schedule_target_installment',
  debtId: 'debt_target_installment',
  plan: { type: 'installment', position: 2, itemCount: 6 },
} as const;

describe('payment target query contract', () => {
  it('normalizes the page, search, and payment-state filter', () => {
    expect(
      paymentTargetQuerySchema.parse({
        page: '2',
        search: '  redesign  ',
        paymentState: 'partiallyPaid',
      }),
    ).toEqual({
      page: 2,
      search: 'redesign',
      paymentState: 'partiallyPaid',
    });
  });

  it('defaults the page and removes a blank search', () => {
    expect(paymentTargetQuerySchema.parse({ search: '   ' })).toEqual({ page: 1 });
  });

  it('allows only eligible payment-state filters', () => {
    expect(eligiblePaymentStateSchema.options).toEqual(
      paymentStateSchema.options.filter((state) => state !== 'paid'),
    );
    expect(paymentTargetQuerySchema.safeParse({ paymentState: 'paid' }).success).toBe(false);
  });

  it('rejects a client-controlled page size', () => {
    expect(paymentTargetQuerySchema.safeParse({ page: 1, pageSize: 50 }).success).toBe(false);
  });
});

describe('payment target response contract', () => {
  it('accepts a one-payment target', () => {
    expect(paymentTargetSchema.parse(validOnePaymentTarget)).toEqual(validOnePaymentTarget);
  });

  it('accepts an installment target with its full-plan context', () => {
    expect(paymentTargetSchema.parse(validInstallmentTarget)).toEqual(validInstallmentTarget);
  });

  it('does not allow paid targets in an eligible-target response', () => {
    expect(
      paymentTargetSchema.safeParse({
        ...validOnePaymentTarget,
        paymentState: 'paid',
      }).success,
    ).toBe(false);
  });

  it('requires the fixed page size in response metadata', () => {
    expect(
      paymentTargetListResponseSchema.parse({
        items: [validOnePaymentTarget],
        page: 1,
        pageSize: paymentTargetPageSize,
        totalItems: 1,
        totalPages: 1,
      }),
    ).toMatchObject({
      page: 1,
      pageSize: paymentTargetPageSize,
      totalItems: 1,
      totalPages: 1,
    });

    expect(
      paymentTargetListResponseSchema.safeParse({
        items: [],
        page: 1,
        pageSize: 5,
        totalItems: 0,
        totalPages: 0,
      }).success,
    ).toBe(false);
  });
});
