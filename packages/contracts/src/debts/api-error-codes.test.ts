import { describe, expect, it } from 'vitest';

import {
  debtApiErrorCode,
  debtApiErrorCodes,
  isDebtApiErrorCode,
} from './api-error-codes.js';

describe('debt API error code contracts', () => {
  it('exports a stable debt API error vocabulary', () => {
    expect(debtApiErrorCodes).toEqual([
      'VALIDATION_ERROR',
      'DEBT_NOT_FOUND',
      'DEBT_VERSION_CONFLICT',
      'DEBT_HAS_PAYMENTS',
      'DEBT_CURRENCY_CHANGE_BLOCKED',
      'DEBT_PAYMENT_PLAN_CHANGE_BLOCKED',
      'DEBT_SCHEDULE_ITEM_HAS_PAYMENTS',
      'DEBT_SCHEDULE_ITEM_AMOUNT_BELOW_PAID',
      'DEBT_TOTAL_AMOUNT_BELOW_PAID',
    ]);
    expect(isDebtApiErrorCode(debtApiErrorCode.debtNotFound)).toBe(true);
    expect(isDebtApiErrorCode(debtApiErrorCode.debtVersionConflict)).toBe(true);
    expect(isDebtApiErrorCode(debtApiErrorCode.debtHasPayments)).toBe(true);
    expect(isDebtApiErrorCode('SOMETHING_ELSE')).toBe(false);
  });
});
