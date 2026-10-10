import { describe, expect, it } from 'vitest';

import {
  createDebtRequestSchema,
  debtListQuerySchema,
  debtListResponseSchema,
  debtResponseSchema,
  replaceDebtRequestSchema,
} from './debt.js';
import {
  debtPlanIssueCode,
  debtRequestValidationCode,
} from './validation-codes.js';

const validCreateRequest = {
  description: '  Website redesign  ',
  totalAmount: ' 125.5 ',
  currency: 'USD',
  scheduleItems: [
    {
      amount: '125.5',
      dueDate: '2026-09-30',
    },
  ],
};

const validReplacementRequest = {
  description: '  Website redesign  ',
  totalAmount: ' 125.5 ',
  currency: 'USD',
  expectedVersion: 3,
  scheduleItems: [
    {
      amount: '125.5',
      dueDate: '2026-09-30',
    },
  ],
};

const validInstallmentDebtResponse = {
  id: 'debt_123',
  customerId: 'customer_123',
  description: 'Website redesign',
  totalAmount: '125.50',
  currency: 'USD',
  paymentPlanType: 'installment',
  scheduleItems: [
    {
      id: 'schedule_123',
      position: 1,
      amount: '0.30',
      dueDate: '2026-09-30',
      timing: 'upcoming',
    },
    {
      id: 'schedule_456',
      position: 2,
      amount: '125.20',
      dueDate: '2026-10-30',
      timing: 'upcoming',
    },
  ],
  createdAt: '2026-09-10T12:00:00.000Z',
  updatedAt: '2026-09-10T12:00:00.000Z',
  version: 3,
};

describe('debt contracts', () => {
  it('normalizes a one-payment create request to an id-less schedule row', () => {
    expect(createDebtRequestSchema.parse(validCreateRequest)).toEqual({
      description: 'Website redesign',
      totalAmount: '125.50',
      currency: 'USD',
      scheduleItems: [
        {
          amount: '125.50',
          dueDate: '2026-09-30',
        },
      ],
    });
  });

  it('normalizes and preserves every row in an installment create request', () => {
    expect(
      createDebtRequestSchema.parse({
        ...validCreateRequest,
        totalAmount: '125.50',
        scheduleItems: [
          { amount: '0.30', dueDate: '2026-09-30' },
          { amount: '125.20', dueDate: '2026-10-30' },
        ],
      }),
    ).toEqual({
      description: 'Website redesign',
      totalAmount: '125.50',
      currency: 'USD',
      scheduleItems: [
        { amount: '0.30', dueDate: '2026-09-30' },
        { amount: '125.20', dueDate: '2026-10-30' },
      ],
    });
  });

  it('normalizes a replacement request while retaining an optional saved row id', () => {
    expect(
      replaceDebtRequestSchema.parse({
        ...validReplacementRequest,
        scheduleItems: [
          {
            ...validReplacementRequest.scheduleItems[0],
            id: 'schedule_123',
          },
        ],
      }),
    ).toEqual({
      description: 'Website redesign',
      totalAmount: '125.50',
      currency: 'USD',
      expectedVersion: 3,
      scheduleItems: [
        {
          id: 'schedule_123',
          amount: '125.50',
          dueDate: '2026-09-30',
        },
      ],
    });
  });

  it('accepts a replacement request without a saved row id', () => {
    expect(replaceDebtRequestSchema.parse(validReplacementRequest)).toEqual({
      description: 'Website redesign',
      totalAmount: '125.50',
      currency: 'USD',
      expectedVersion: 3,
      scheduleItems: [
        {
          amount: '125.50',
          dueDate: '2026-09-30',
        },
      ],
    });
  });

  it('accepts retained and new rows in a multi-row replacement request', () => {
    expect(
      replaceDebtRequestSchema.parse({
        ...validReplacementRequest,
        scheduleItems: [
          { id: 'schedule_123', amount: '0.30', dueDate: '2026-09-30' },
          { amount: '125.20', dueDate: '2026-10-30' },
        ],
      }),
    ).toEqual({
      description: 'Website redesign',
      totalAmount: '125.50',
      currency: 'USD',
      expectedVersion: 3,
      scheduleItems: [
        { id: 'schedule_123', amount: '0.30', dueDate: '2026-09-30' },
        { amount: '125.20', dueDate: '2026-10-30' },
      ],
    });
  });

  it('rejects duplicate saved IDs with one schedule-level issue', () => {
    const result = replaceDebtRequestSchema.safeParse({
      ...validReplacementRequest,
      scheduleItems: [
        { id: 'schedule_123', amount: '60.00', dueDate: '2026-09-30' },
        { id: 'schedule_123', amount: '65.50', dueDate: '2026-10-30' },
      ],
    });

    expect(result.success).toBe(false);

    if (result.success) {
      return;
    }

    expect(result.error.issues).toEqual([
      expect.objectContaining({
        code: 'custom',
        path: ['scheduleItems'],
        message: debtRequestValidationCode.debtScheduleItemIdDuplicate,
      }),
    ]);
  });

  it('allows multiple new rows in a replacement request', () => {
    expect(
      replaceDebtRequestSchema.parse({
        ...validReplacementRequest,
        scheduleItems: [
          { amount: '0.30', dueDate: '2026-09-30' },
          { amount: '125.20', dueDate: '2026-10-30' },
        ],
      }).scheduleItems,
    ).toEqual([
      { amount: '0.30', dueDate: '2026-09-30' },
      { amount: '125.20', dueDate: '2026-10-30' },
    ]);
  });

  it('rejects ids on create schedule items', () => {
    const result = createDebtRequestSchema.safeParse({
      ...validCreateRequest,
      scheduleItems: [
        {
          ...validCreateRequest.scheduleItems[0],
          id: 'schedule_attacker',
        },
      ],
    });

    expect(result.success).toBe(false);
  });

  it('rejects unknown properties on create requests', () => {
    const result = createDebtRequestSchema.safeParse({
      ...validCreateRequest,
      unknownProperty: true,
    });

    expect(result.success).toBe(false);
  });

  it('rejects unknown properties on schedule items', () => {
    const result = createDebtRequestSchema.safeParse({
      ...validCreateRequest,
      scheduleItems: [
        {
          ...validCreateRequest.scheduleItems[0],
          unexpectedField: true,
        },
      ],
    });

    expect(result.success).toBe(false);
  });

  it.each([
    { label: 'no rows', scheduleItems: [] },
    {
      label: 'multiple rows',
      scheduleItems: [
        ...validCreateRequest.scheduleItems,
        ...validCreateRequest.scheduleItems,
      ],
    },
  ])('requires exactly one schedule row: $label', ({ scheduleItems }) => {
    const result = createDebtRequestSchema.safeParse({
      ...validCreateRequest,
      scheduleItems,
    });

    expect(result.success).toBe(false);
  });

  it('rejects a schedule amount that does not match the total', () => {
    const result = createDebtRequestSchema.safeParse({
      ...validCreateRequest,
      scheduleItems: [
        {
          amount: '100.00',
          dueDate: '2026-09-30',
        },
      ],
    });

    expect(result.success).toBe(false);

    if (result.success) {
      return;
    }

    expect(result.error.issues).toContainEqual(
      expect.objectContaining({
        path: ['scheduleItems', 0, 'amount'],
        message: debtPlanIssueCode.scheduleItemAmountDoesNotMatchTotal,
      }),
    );
  });

  it('reports a non-positive schedule amount at the schedule row field', () => {
    const result = createDebtRequestSchema.safeParse({
      ...validCreateRequest,
      totalAmount: '0.00',
      scheduleItems: [
        {
          amount: '0.00',
          dueDate: '2026-09-30',
        },
      ],
    });

    expect(result.success).toBe(false);

    if (result.success) {
      return;
    }

    expect(result.error.issues).toContainEqual(
      expect.objectContaining({
        path: ['scheduleItems', 0, 'amount'],
        message: debtPlanIssueCode.scheduleItemAmountNotPositive,
      }),
    );
  });

  it('rejects an invalid one-payment due date', () => {
    const result = createDebtRequestSchema.safeParse({
      ...validCreateRequest,
      scheduleItems: [
        {
          amount: '125.50',
          dueDate: '2026-02-30',
        },
      ],
    });

    expect(result.success).toBe(false);

    if (result.success) {
      return;
    }

    expect(result.error.issues[0]?.message).toBe(
      debtPlanIssueCode.scheduleItemDueDateInvalid,
    );
  });

  it('rejects a malformed debt amount with an invalid code', () => {
    const result = createDebtRequestSchema.safeParse({
      ...validCreateRequest,
      totalAmount: 'not-an-amount',
    });

    expect(result.success).toBe(false);

    if (result.success) {
      return;
    }

    expect(result.error.issues[0]?.message).toBe(
      debtRequestValidationCode.debtTotalAmountInvalid,
    );
  });

  it('rejects a malformed schedule amount with a schedule-item code', () => {
    const result = createDebtRequestSchema.safeParse({
      ...validCreateRequest,
      scheduleItems: [
        {
          amount: 'not-an-amount',
          dueDate: '2026-09-30',
        },
      ],
    });

    expect(result.success).toBe(false);

    if (result.success) {
      return;
    }

    expect(result.error.issues[0]?.message).toBe(
      debtRequestValidationCode.debtScheduleItemAmountInvalid,
    );
  });

  it('rejects a debt amount outside NUMERIC(18,2)', () => {
    const oversizedAmount = '10000000000000000.00';
    const result = createDebtRequestSchema.safeParse({
      ...validCreateRequest,
      totalAmount: oversizedAmount,
      scheduleItems: [
        {
          amount: oversizedAmount,
          dueDate: '2026-09-30',
        },
      ],
    });

    expect(result.success).toBe(false);

    if (result.success) {
      return;
    }

    expect(result.error.issues).toContainEqual(
      expect.objectContaining({
        path: ['totalAmount'],
        message: debtRequestValidationCode.debtTotalAmountTooLarge,
      }),
    );
  });

  it('rejects an unsupported debt currency', () => {
    const result = createDebtRequestSchema.safeParse({
      ...validCreateRequest,
      currency: 'GBP',
    });

    expect(result.success).toBe(false);
  });

  it('rejects a blank debt description', () => {
    const result = createDebtRequestSchema.safeParse({
      ...validCreateRequest,
      description: '   ',
    });

    expect(result.success).toBe(false);

    if (result.success) {
      return;
    }

    expect(result.error.issues[0]?.message).toBe(
      debtRequestValidationCode.debtDescriptionRequired,
    );
  });

  it('rejects a debt description longer than 200 characters', () => {
    const result = createDebtRequestSchema.safeParse({
      ...validCreateRequest,
      description: 'a'.repeat(201),
    });

    expect(result.success).toBe(false);

    if (result.success) {
      return;
    }

    expect(result.error.issues[0]?.message).toBe(
      debtRequestValidationCode.debtDescriptionTooLong,
    );
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
            timing: 'upcoming',
          },
        ],
        createdAt: '2026-09-10T12:00:00.000Z',
        updatedAt: '2026-09-10T12:00:00.000Z',
        version: 3,
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
          timing: 'upcoming',
        },
      ],
      createdAt: '2026-09-10T12:00:00.000Z',
      updatedAt: '2026-09-10T12:00:00.000Z',
      version: 3,
    });
  });

  it('accepts a canonical installment debt response', () => {
    expect(debtResponseSchema.parse(validInstallmentDebtResponse)).toEqual(
      validInstallmentDebtResponse,
    );
  });

  it('rejects a one-payment response with multiple schedule rows', () => {
    const result = debtResponseSchema.safeParse({
      ...validInstallmentDebtResponse,
      paymentPlanType: 'onePayment',
    });

    expect(result.success).toBe(false);
  });

  it('rejects installment responses with non-contiguous positions', () => {
    const result = debtResponseSchema.safeParse({
      ...validInstallmentDebtResponse,
      scheduleItems: validInstallmentDebtResponse.scheduleItems.map(
        (scheduleItem, index) =>
          index === 1 ? { ...scheduleItem, position: 3 } : scheduleItem,
      ),
    });

    expect(result.success).toBe(false);
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
          timing: 'upcoming',
        },
      ],
      createdAt: '2026-09-10T12:00:00.000Z',
      updatedAt: '2026-09-10T12:00:00.000Z',
    });

    expect(result.success).toBe(false);
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
                timing: 'upcoming',
              },
            ],
            createdAt: '2026-09-10T12:00:00.000Z',
            updatedAt: '2026-09-10T12:00:00.000Z',
            version: 3,
          },
        ],
        page: 1,
        pageSize: 5,
        totalItems: 1,
        totalPages: 1,
      }),
    ).toMatchObject({
      page: 1,
      pageSize: 5,
      totalItems: 1,
      totalPages: 1,
    });
  });

  it('normalizes a debt list query page and defaults omitted pages', () => {
    expect(debtListQuerySchema.parse({ page: '2' })).toEqual({ page: 2 });
    expect(debtListQuerySchema.parse({})).toEqual({ page: 1 });
  });
});
