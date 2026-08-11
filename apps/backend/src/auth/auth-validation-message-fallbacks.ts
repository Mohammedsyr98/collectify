import {
  authValidationCode,
  isAuthValidationCode,
  type AuthValidationCode,
} from '@collectify/contracts';

const authValidationMessageFallbacks = {
  [authValidationCode.authDefaultCurrencyUnsupported]:
    'Choose TRY, USD, or EUR.',
  [authValidationCode.authEmailInvalid]: 'Enter a valid email address.',
  [authValidationCode.authNameRequired]: 'Name is required.',
  [authValidationCode.authPreferredLanguageUnsupported]:
    'Choose English or Turkish.',
  [authValidationCode.authSignInPasswordRequired]: 'Password is required.',
  [authValidationCode.authSignUpPasswordLength]:
    'Password must be between 8 and 128 characters.',
} satisfies Record<AuthValidationCode, string>;

export function getAuthValidationMessageFallback(message: string): string {
  if (isAuthValidationCode(message)) {
    return authValidationMessageFallbacks[message];
  }

  return message;
}
