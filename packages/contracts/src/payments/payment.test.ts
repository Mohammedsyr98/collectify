import { describe, expect, it } from 'vitest';

import {
  paymentApiErrorCode,
  paymentApiErrorCodes,
  isPaymentApiErrorCode,
} from './api-error-codes.js';
import {
  paymentErrorResponseSchema,
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
    ]);
    expect(isPaymentApiErrorCode(paymentApiErrorCode.validationError)).toBe(true);
    expect(isPaymentApiErrorCode(paymentApiErrorCode.paymentTargetNotFound)).toBe(true);
    expect(isPaymentApiErrorCode(paymentApiErrorCode.paymentDebtVersionConflict)).toBe(true);
    expect(isPaymentApiErrorCode('SOMETHING_ELSE')).toBe(false);
    expect(isPaymentApiErrorCode(undefined)).toBe(false);
  });
});
