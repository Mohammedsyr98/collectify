export const validationErrorCode = {
  authDefaultCurrencyUnsupported: 'AUTH_DEFAULT_CURRENCY_UNSUPPORTED',
  authEmailInvalid: 'AUTH_EMAIL_INVALID',
  authNameRequired: 'AUTH_NAME_REQUIRED',
  authPreferredLanguageUnsupported: 'AUTH_PREFERRED_LANGUAGE_UNSUPPORTED',
  authSignInPasswordRequired: 'AUTH_SIGN_IN_PASSWORD_REQUIRED',
  authSignUpPasswordLength: 'AUTH_SIGN_UP_PASSWORD_LENGTH',
} as const;

export const validationErrorCodes = Object.values(validationErrorCode);

export type ValidationErrorCode =
  (typeof validationErrorCode)[keyof typeof validationErrorCode];

const validationErrorCodeSet = new Set<string>(validationErrorCodes);

const validationErrorFallbacks = {
  [validationErrorCode.authDefaultCurrencyUnsupported]:
    'Choose TRY, USD, or EUR.',
  [validationErrorCode.authEmailInvalid]: 'Enter a valid email address.',
  [validationErrorCode.authNameRequired]: 'Name is required.',
  [validationErrorCode.authPreferredLanguageUnsupported]:
    'Choose English or Turkish.',
  [validationErrorCode.authSignInPasswordRequired]: 'Password is required.',
  [validationErrorCode.authSignUpPasswordLength]:
    'Password must be between 8 and 128 characters.',
} satisfies Record<ValidationErrorCode, string>;

export function isValidationErrorCode(
  message: string | undefined,
): message is ValidationErrorCode {
  return typeof message === 'string' && validationErrorCodeSet.has(message);
}

export function getValidationErrorMessageFallback(
  code: ValidationErrorCode,
): string {
  return validationErrorFallbacks[code];
}
