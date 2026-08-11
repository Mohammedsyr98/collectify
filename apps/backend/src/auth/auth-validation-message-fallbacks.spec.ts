import { authValidationCode } from '@collectify/contracts';
import { describe, expect, it } from 'vitest';

import { getAuthValidationMessageFallback } from './auth-validation-message-fallbacks';

describe('auth validation message fallbacks', () => {
  it('resolves auth validation codes to backend-owned English messages', () => {
    expect(
      getAuthValidationMessageFallback(authValidationCode.authNameRequired),
    ).toBe('Name is required.');
    expect(
      getAuthValidationMessageFallback(authValidationCode.authEmailInvalid),
    ).toBe('Enter a valid email address.');
    expect(
      getAuthValidationMessageFallback(
        authValidationCode.authSignUpPasswordLength,
      ),
    ).toBe('Password must be between 8 and 128 characters.');
  });

  it('passes through non-auth validation messages unchanged', () => {
    expect(getAuthValidationMessageFallback('Reference is required.')).toBe(
      'Reference is required.',
    );
  });
});
