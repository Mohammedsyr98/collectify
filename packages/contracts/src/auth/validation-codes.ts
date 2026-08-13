export const authValidationCode = {
  authDefaultCurrencyUnsupported: 'AUTH_DEFAULT_CURRENCY_UNSUPPORTED',
  authEmailInvalid: 'AUTH_EMAIL_INVALID',
  authNameRequired: 'AUTH_NAME_REQUIRED',
  authPreferredLanguageUnsupported: 'AUTH_PREFERRED_LANGUAGE_UNSUPPORTED',
  authSignInPasswordRequired: 'AUTH_SIGN_IN_PASSWORD_REQUIRED',
  authSignUpPasswordLength: 'AUTH_SIGN_UP_PASSWORD_LENGTH',
} as const;

export const authValidationCodes = [
  authValidationCode.authDefaultCurrencyUnsupported,
  authValidationCode.authEmailInvalid,
  authValidationCode.authNameRequired,
  authValidationCode.authPreferredLanguageUnsupported,
  authValidationCode.authSignInPasswordRequired,
  authValidationCode.authSignUpPasswordLength,
] as const;

export type AuthValidationCode = (typeof authValidationCodes)[number];

const authValidationCodeSet = new Set<string>(authValidationCodes);

export function isAuthValidationCode(
  message: string | undefined,
): message is AuthValidationCode {
  return typeof message === 'string' && authValidationCodeSet.has(message);
}
