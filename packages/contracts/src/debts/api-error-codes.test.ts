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
    ]);
    expect(isDebtApiErrorCode(debtApiErrorCode.debtNotFound)).toBe(true);
    expect(isDebtApiErrorCode('SOMETHING_ELSE')).toBe(false);
  });
});
