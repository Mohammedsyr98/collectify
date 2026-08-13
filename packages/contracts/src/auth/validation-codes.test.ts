import { describe, expect, it } from 'vitest';

import {
  authValidationCode,
  authValidationCodes,
  isAuthValidationCode,
} from './validation-codes.js';

describe('auth validation code contracts', () => {
  it('exports stable auth validation codes', () => {
    expect(authValidationCodes).toEqual([
      'AUTH_DEFAULT_CURRENCY_UNSUPPORTED',
      'AUTH_EMAIL_INVALID',
      'AUTH_NAME_REQUIRED',
      'AUTH_PREFERRED_LANGUAGE_UNSUPPORTED',
      'AUTH_SIGN_IN_PASSWORD_REQUIRED',
      'AUTH_SIGN_UP_PASSWORD_LENGTH',
    ]);
    expect(isAuthValidationCode(authValidationCode.authEmailInvalid)).toBe(
      true,
    );
    expect(isAuthValidationCode('Name is required.')).toBe(false);
  });
});
