import { describe, expect, it } from 'vitest';

import {
  customerApiErrorCode,
  customerApiErrorCodes,
  isCustomerApiErrorCode,
} from './api-error-codes.js';

describe('customer API error code contracts', () => {
  it('exports stable customer API error code vocabulary', () => {
    expect(customerApiErrorCodes).toEqual([
      'VALIDATION_ERROR',
      'CUSTOMER_CODE_ALREADY_EXISTS',
      'CUSTOMER_NOT_FOUND',
    ]);
    expect(
      isCustomerApiErrorCode(customerApiErrorCode.customerCodeAlreadyExists),
    ).toBe(true);
    expect(isCustomerApiErrorCode('SOMETHING_ELSE')).toBe(false);
  });
});
