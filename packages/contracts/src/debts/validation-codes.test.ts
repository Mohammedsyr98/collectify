import { describe, expect, it } from 'vitest';

import {
  debtValidationCode,
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
      'DEBT_SCHEDULE_ITEM_AMOUNT_DOES_NOT_MATCH_TOTAL',
      'DEBT_SCHEDULE_ITEM_AMOUNT_INVALID',
      'DEBT_SCHEDULE_ITEM_AMOUNT_MUST_BE_POSITIVE',
      'DEBT_SCHEDULE_ITEM_COUNT_INVALID',
      'DEBT_TOTAL_AMOUNT_INVALID',
      'DEBT_TOTAL_AMOUNT_TOO_LARGE',
      'DEBT_TOTAL_AMOUNT_MUST_BE_POSITIVE',
    ]);
    expect(
      isDebtValidationCode(debtValidationCode.debtTotalAmountInvalid),
    ).toBe(true);
    expect(isDebtValidationCode('Amount is invalid.')).toBe(false);
  });
});
