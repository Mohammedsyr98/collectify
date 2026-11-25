import { describe, expect, it } from 'vitest';

import {
  paymentApiErrorCode,
  paymentApiErrorCodes,
  isPaymentApiErrorCode,
} from './api-error-codes.js';
import {
  deletePaymentRequestSchema,
  deletePaymentResponseSchema,
  paymentErrorResponseSchema,
  replacePaymentRequestSchema,
  replacePaymentResponseSchema,
  recordPaymentRequestSchema,
  recordPaymentResponseSchema,
} from './payment.js';
import { paymentValidationCode } from './validation-codes.js';

const validRequest = {
  targetScheduleItemId: 'schedule_payment_contract',
  amount: '25.20',
  paymentDate: '2026-10-20',
  expectedDebtVersion: 1,
  idempotencyKey: '10000000-0000-4000-8000-000000000001',
} as const;

describe('record payment request contract', () => {
  it('canonicalizes amount and blank notes before the request is fingerprinted', () => {
    expect(
      recordPaymentRequestSchema.parse({
        ...validRequest,
        amount: ' 25.2 ',
        note: '   ',
      }),
    ).toEqual({
      ...validRequest,
      amount: '25.20',
      note: null,
    });
  });

  it.each([
    ['omitted note', {}],
    ['null note', { note: null }],
  ])('normalizes %s to a null note', (_description, note) => {
    expect(recordPaymentRequestSchema.parse({ ...validRequest, ...note })).toEqual({
      ...validRequest,
      note: null,
    });
  });

  it('rejects client-supplied debt, customer, or currency fields', () => {
    const result = recordPaymentRequestSchema.safeParse({
      ...validRequest,
      customerId: 'customer_supplied_by_client',
      debtId: 'debt_supplied_by_client',
      currency: 'EUR',
    });

    expect(result.success).toBe(false);
  });

  it.each([
    ['blank target', { targetScheduleItemId: ' ' }, 'targetScheduleItemId', paymentValidationCode.paymentTargetScheduleItemIdRequired],
    ['zero amount', { amount: '0' }, 'amount', paymentValidationCode.paymentAmountInvalid],
    ['negative amount', { amount: '-1.00' }, 'amount', paymentValidationCode.paymentAmountInvalid],
    ['over-precision amount', { amount: '1.001' }, 'amount', paymentValidationCode.paymentAmountInvalid],
    ['invalid date syntax', { paymentDate: '2026-1-1' }, 'paymentDate', paymentValidationCode.paymentDateInvalid],
    ['non-positive version', { expectedDebtVersion: 0 }, 'expectedDebtVersion', paymentValidationCode.paymentExpectedDebtVersionInvalid],
    ['invalid idempotency key', { idempotencyKey: 'not-a-uuid' }, 'idempotencyKey', paymentValidationCode.paymentIdempotencyKeyInvalid],
    ['overlong note', { note: 'x'.repeat(501) }, 'note', paymentValidationCode.paymentNoteTooLong],
  ])('rejects %s with its field validation code', (_description, change, field, code) => {
    const result = recordPaymentRequestSchema.safeParse({
      ...validRequest,
      ...change,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some(
          (issue) => issue.path[0] === field && issue.message === code,
        ),
      ).toBe(true);
    }
  });
});

describe('record payment response contract', () => {
  it('accepts the persisted payment response', () => {
    const response = {
      payment: {
        id: 'payment_contract',
        scheduleItemId: 'schedule_payment_contract',
        amount: '25.20',
        paymentDate: '2026-10-20',
        note: null,
        idempotencyKey: validRequest.idempotencyKey,
        createdAt: '2026-10-20T07:00:00.000Z',
        updatedAt: '2026-10-20T07:00:00.000Z',
      },
    };

    expect(recordPaymentResponseSchema.parse(response)).toEqual(response);
  });

  it('accepts a debt-version conflict response', () => {
    const error = {
      code: paymentApiErrorCode.paymentDebtVersionConflict,
      message: 'Debt was changed by another request.',
    };

    expect(paymentErrorResponseSchema.parse(error)).toEqual(error);
  });
});

describe('replace payment request contract', () => {
  const validReplacement = {
    targetScheduleItemId: 'schedule_payment_contract',
    amount: '25.20',
    paymentDate: '2026-10-20',
    note: null,
    expectedSourceDebtVersion: 4,
  } as const;

  it('accepts the complete editable payment state and normalizes blank notes', () => {
    expect(
      replacePaymentRequestSchema.parse({
        ...validReplacement,
        amount: ' 25.2 ',
        note: '   ',
      }),
    ).toEqual(validReplacement);
  });

  it.each([
    ['missing note', { note: undefined }],
    ['non-positive source version', { expectedSourceDebtVersion: 0 }],
    ['invalid date syntax', { paymentDate: '2026-1-1' }],
    ['invalid amount', { amount: '0' }],
  ])('rejects %s', (_description, change) => {
    expect(
      replacePaymentRequestSchema.safeParse({ ...validReplacement, ...change }),
    ).toMatchObject({ success: false });
  });

  it('rejects fields that could change the payment target or identity', () => {
    expect(
      replacePaymentRequestSchema.safeParse({
        ...validReplacement,
        targetScheduleItemId: 'client_target',
        paymentId: 'client_payment',
        idempotencyKey: '10000000-0000-4000-8000-000000000001',
      }).success,
    ).toBe(false);
  });
});

describe('replace payment response contract', () => {
  it('uses the persisted payment response shape', () => {
    const response = {
      payment: {
        id: 'payment_contract',
        scheduleItemId: 'schedule_payment_contract',
        amount: '25.20',
        paymentDate: '2026-10-20',
        note: null,
        idempotencyKey: validRequest.idempotencyKey,
        createdAt: '2026-10-20T07:00:00.000Z',
        updatedAt: '2026-10-20T07:00:01.000Z',
      },
      sourceDebt: createDebtResponse('debt_source'),
      destinationDebt: createDebtResponse('debt_destination'),
    };

    expect(replacePaymentResponseSchema.parse(response)).toEqual(response);
  });
});

describe('delete payment contract', () => {
  it('requires the debt version and returns the committed debt and customer impact', () => {
    const request = { expectedDebtVersion: 4 };
    const response = {
      deletedPaymentId: 'payment_contract',
      debt: {
        ...createDebtResponse('debt_source'),
        paidAmount: '0.00',
        remainingAmount: '100.00',
        paymentState: 'unpaid' as const,
        paymentCount: 0,
        version: 5,
        scheduleItems: [
          {
            id: 'schedule_payment_contract',
            position: 1 as const,
            amount: '100.00',
            paidAmount: '0.00',
            remainingAmount: '100.00',
            paymentState: 'unpaid' as const,
            paymentCount: 0,
            dueDate: '2026-10-20',
            timing: 'upcoming' as const,
          },
        ],
      },
      customerFinancialSummary: [
        {
          currency: 'USD' as const,
          totalDebtAmount: '100.00',
          totalPaidAmount: '0.00',
          remainingAmount: '100.00',
        },
      ],
    };

    expect(deletePaymentRequestSchema.parse(request)).toEqual(request);
    expect(deletePaymentResponseSchema.parse(response)).toEqual(response);
    expect(deletePaymentRequestSchema.safeParse({ expectedDebtVersion: 0 }).success).toBe(false);
  });
});

function createDebtResponse(id: string) {
  return {
    id,
    customerId: 'customer_contract',
    description: 'Contract debt',
    totalAmount: '100.00',
    paidAmount: '25.20',
    remainingAmount: '74.80',
    paymentState: 'partiallyPaid' as const,
    paymentCount: 1,
    currency: 'USD' as const,
    createdAt: '2026-10-20T07:00:00.000Z',
    updatedAt: '2026-10-20T07:00:01.000Z',
    version: 2,
    paymentPlanType: 'onePayment' as const,
    scheduleItems: [
      {
        id: 'schedule_payment_contract',
        position: 1 as const,
        amount: '100.00',
        paidAmount: '25.20',
        remainingAmount: '74.80',
        paymentState: 'partiallyPaid' as const,
        paymentCount: 1,
        dueDate: '2026-10-20',
        timing: 'upcoming' as const,
      },
    ],
  };
}

describe('payment API error code contracts', () => {
  it('exports the stable payment API error vocabulary', () => {
    expect(paymentApiErrorCodes).toEqual([
      'VALIDATION_ERROR',
      'PAYMENT_TARGET_NOT_FOUND',
      'PAYMENT_DATE_IN_FUTURE',
      'PAYMENT_TARGET_ALREADY_PAID',
      'PAYMENT_AMOUNT_EXCEEDS_REMAINING',
      'PAYMENT_DEBT_VERSION_CONFLICT',
      'PAYMENT_IDEMPOTENCY_KEY_REUSED',
      'PAYMENT_NOT_FOUND',
    ]);
    expect(isPaymentApiErrorCode(paymentApiErrorCode.validationError)).toBe(true);
    expect(isPaymentApiErrorCode(paymentApiErrorCode.paymentTargetNotFound)).toBe(true);
    expect(isPaymentApiErrorCode(paymentApiErrorCode.paymentDebtVersionConflict)).toBe(true);
    expect(isPaymentApiErrorCode('SOMETHING_ELSE')).toBe(false);
    expect(isPaymentApiErrorCode(undefined)).toBe(false);
  });
});
