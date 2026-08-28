import { describe, expect, it } from 'vitest';

import {
  customerValidationCode,
  customerValidationCodes,
  isCustomerValidationCode,
} from './validation-codes.js';

describe('customer validation code contracts', () => {
  it('exports stable customer validation code vocabulary', () => {
    expect(customerValidationCodes).toEqual([
      'CUSTOMER_CODE_REQUIRED',
      'CUSTOMER_NAME_REQUIRED',
      'CUSTOMER_PHONE_NUMBER_REQUIRED',
    ]);
    expect(
      isCustomerValidationCode(customerValidationCode.customerNameRequired),
    ).toBe(true);
    expect(isCustomerValidationCode('SOMETHING_ELSE')).toBe(false);
  });
});
