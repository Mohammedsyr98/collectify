import { describe, expect, it } from 'vitest';

import {
  debtPlanIssueCode,
  debtRequestValidationCode,
  debtValidationCodes,
  isDebtValidationCode,
} from './validation-codes.js';

describe('debt validation code contracts', () => {
  it('exports stable debt validation codes', () => {
    expect(debtValidationCodes).toEqual([
      'DEBT_DESCRIPTION_REQUIRED',
      'DEBT_DESCRIPTION_TOO_LONG',
      'DEBT_DUE_DATE_INVALID',
      'DEBT_DUE_DATE_REQUIRED',
      'DEBT_SCHEDULE_ITEM_AMOUNT_INVALID',
      'DEBT_TOTAL_AMOUNT_INVALID',
      'SCHEDULE_ITEM_COUNT_INVALID',
      'SCHEDULE_ITEM_AMOUNT_NOT_POSITIVE',
      'SCHEDULE_ITEM_AMOUNT_DOES_NOT_MATCH_TOTAL',
      'SCHEDULE_ITEM_DUE_DATE_INVALID',
    ]);
    expect(
      isDebtValidationCode(debtRequestValidationCode.debtTotalAmountInvalid),
    ).toBe(true);
    expect(
      isDebtValidationCode(debtPlanIssueCode.scheduleItemAmountNotPositive),
    ).toBe(true);
    expect(isDebtValidationCode('Amount is invalid.')).toBe(false);
  });
});
