import { describe, expect, it } from 'vitest';

import {
  authApiErrorCode,
  authApiErrorCodes,
  isAuthApiErrorCode,
} from './api-error-codes.js';

describe('auth API error code contracts', () => {
  it('exports stable auth API error code vocabulary', () => {
    expect(authApiErrorCodes).toEqual([
      'VALIDATION_ERROR',
      'INVALID_CREDENTIALS',
      'OWNER_PROFILE_MISSING',
      'ACCOUNT_ALREADY_EXISTS',
      'PROFILE_SETUP_FAILED',
    ]);
    expect(isAuthApiErrorCode(authApiErrorCode.validationError)).toBe(true);
    expect(isAuthApiErrorCode('SOMETHING_ELSE')).toBe(false);
  });
});
