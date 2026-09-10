import { describe, expect, it } from 'vitest';

import {
  createDebtRequestSchema,
  debtListResponseSchema,
  debtResponseSchema,
} from './debt.js';

describe('debt contracts', () => {
  it('normalizes a one-payment create request', () => {
    expect(
      createDebtRequestSchema.parse({
        description: '  Website redesign  ',
        totalAmount: ' 125.5 ',
        currency: 'USD',
        paymentPlan: {
          type: 'onePayment',
          dueDate: '2026-09-30',
        },
      }),
    ).toEqual({
      description: 'Website redesign',
      totalAmount: '125.50',
      currency: 'USD',
      paymentPlan: {
        type: 'onePayment',
        dueDate: '2026-09-30',
      },
    });
  });

  it('rejects extra fields in a one-payment plan', () => {
    const result = createDebtRequestSchema.safeParse({
      description: 'Website redesign',
      totalAmount: '125.50',
      currency: 'USD',
      paymentPlan: {
        type: 'onePayment',
        dueDate: '2026-09-30',
        unexpectedField: true,
      },
    });

    expect(result.success).toBe(false);
  });

  it('rejects an invalid one-payment due date', () => {
    const result = createDebtRequestSchema.safeParse({
      description: 'Website redesign',
      totalAmount: '125.50',
      currency: 'USD',
      paymentPlan: {
        type: 'onePayment',
        dueDate: '2026-02-30',
      },
    });

    expect(result.success).toBe(false);
  });

  it('rejects an unsupported debt currency', () => {
    const result = createDebtRequestSchema.safeParse({
      description: 'Website redesign',
      totalAmount: '125.50',
      currency: 'GBP',
      paymentPlan: {
        type: 'onePayment',
        dueDate: '2026-09-30',
      },
    });

    expect(result.success).toBe(false);
  });

  it('rejects a blank debt description', () => {
    const result = createDebtRequestSchema.safeParse({
      description: '   ',
      totalAmount: '125.50',
      currency: 'USD',
      paymentPlan: {
        type: 'onePayment',
        dueDate: '2026-09-30',
      },
    });

    expect(result.success).toBe(false);
  });

  it('rejects a debt description longer than 200 characters', () => {
    const result = createDebtRequestSchema.safeParse({
      description: 'a'.repeat(201),
      totalAmount: '125.50',
      currency: 'USD',
      paymentPlan: {
        type: 'onePayment',
        dueDate: '2026-09-30',
      },
    });

    expect(result.success).toBe(false);
  });

  it('accepts a canonical one-payment debt response', () => {
    expect(
      debtResponseSchema.parse({
        id: 'debt_123',
        customerId: 'customer_123',
        description: 'Website redesign',
        totalAmount: '125.50',
        currency: 'USD',
        paymentPlanType: 'onePayment',
        scheduleItems: [
          {
            id: 'schedule_123',
            position: 1,
            amount: '125.50',
            dueDate: '2026-09-30',
          },
        ],
        createdAt: '2026-09-10T12:00:00.000Z',
        updatedAt: '2026-09-10T12:00:00.000Z',
      }),
    ).toEqual({
      id: 'debt_123',
      customerId: 'customer_123',
      description: 'Website redesign',
      totalAmount: '125.50',
      currency: 'USD',
      paymentPlanType: 'onePayment',
      scheduleItems: [
        {
          id: 'schedule_123',
          position: 1,
          amount: '125.50',
          dueDate: '2026-09-30',
        },
      ],
      createdAt: '2026-09-10T12:00:00.000Z',
      updatedAt: '2026-09-10T12:00:00.000Z',
    });
  });

  it('rejects a non-canonical amount in a debt response', () => {
    const result = debtResponseSchema.safeParse({
      id: 'debt_123',
      customerId: 'customer_123',
      description: 'Website redesign',
      totalAmount: '125.5',
      currency: 'USD',
      paymentPlanType: 'onePayment',
      scheduleItems: [
        {
          id: 'schedule_123',
          position: 1,
          amount: '125.50',
          dueDate: '2026-09-30',
        },
      ],
      createdAt: '2026-09-10T12:00:00.000Z',
      updatedAt: '2026-09-10T12:00:00.000Z',
    });

    expect(result.success).toBe(false);
  });

  it('rejects a zero-value debt total', () => {
    const result = createDebtRequestSchema.safeParse({
      description: 'Website redesign',
      totalAmount: '0.00',
      currency: 'USD',
      paymentPlan: {
        type: 'onePayment',
        dueDate: '2026-09-30',
      },
    });

    expect(result.success).toBe(false);

    if (result.success) {
      return;
    }

    expect(result.error.issues[0]?.path).toEqual(['totalAmount']);
  });

  it('rejects a debt total outside NUMERIC(18,2)', () => {
    const result = createDebtRequestSchema.safeParse({
      description: 'Website redesign',
      totalAmount: '10000000000000000.00',
      currency: 'USD',
      paymentPlan: {
        type: 'onePayment',
        dueDate: '2026-09-30',
      },
    });

    expect(result.success).toBe(false);

    if (result.success) {
      return;
    }

    expect(result.error.issues[0]?.path).toEqual(['totalAmount']);
  });

  it('accepts a first-page debt list with truthful metadata', () => {
    expect(
      debtListResponseSchema.parse({
        items: [
          {
            id: 'debt_123',
            customerId: 'customer_123',
            description: 'Website redesign',
            totalAmount: '125.50',
            currency: 'USD',
            paymentPlanType: 'onePayment',
            scheduleItems: [
              {
                id: 'schedule_123',
                position: 1,
                amount: '125.50',
                dueDate: '2026-09-30',
              },
            ],
            createdAt: '2026-09-10T12:00:00.000Z',
            updatedAt: '2026-09-10T12:00:00.000Z',
          },
        ],
        page: 1,
        pageSize: 5,
        totalItems: 1,
        totalPages: 1,
      }),
    ).toEqual({
      items: [
        {
          id: 'debt_123',
          customerId: 'customer_123',
          description: 'Website redesign',
          totalAmount: '125.50',
          currency: 'USD',
          paymentPlanType: 'onePayment',
          scheduleItems: [
            {
              id: 'schedule_123',
              position: 1,
              amount: '125.50',
              dueDate: '2026-09-30',
            },
          ],
          createdAt: '2026-09-10T12:00:00.000Z',
          updatedAt: '2026-09-10T12:00:00.000Z',
        },
      ],
      page: 1,
      pageSize: 5,
      totalItems: 1,
      totalPages: 1,
    });
  });
});
