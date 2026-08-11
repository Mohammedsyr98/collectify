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

export const authApiErrorCode = {
  validationError: 'VALIDATION_ERROR',
  invalidCredentials: 'INVALID_CREDENTIALS',
  ownerProfileMissing: 'OWNER_PROFILE_MISSING',
  accountAlreadyExists: 'ACCOUNT_ALREADY_EXISTS',
  profileSetupFailed: 'PROFILE_SETUP_FAILED',
} as const;

export const authApiErrorCodes = [
  authApiErrorCode.validationError,
  authApiErrorCode.invalidCredentials,
  authApiErrorCode.ownerProfileMissing,
  authApiErrorCode.accountAlreadyExists,
  authApiErrorCode.profileSetupFailed,
] as const;

export type AuthApiErrorCode = (typeof authApiErrorCodes)[number];

const authApiErrorCodeSet = new Set<string>(authApiErrorCodes);

export function isAuthApiErrorCode(
  code: string | undefined,
): code is AuthApiErrorCode {
  return typeof code === 'string' && authApiErrorCodeSet.has(code);
}

export const ownerSignInApiErrorCodes = [
  authApiErrorCode.validationError,
  authApiErrorCode.invalidCredentials,
  authApiErrorCode.ownerProfileMissing,
] as const;

export type OwnerSignInApiErrorCode =
  (typeof ownerSignInApiErrorCodes)[number];

const ownerSignInApiErrorCodeSet = new Set<string>(ownerSignInApiErrorCodes);

export function isOwnerSignInApiErrorCode(
  code: string | undefined,
): code is OwnerSignInApiErrorCode {
  return typeof code === 'string' && ownerSignInApiErrorCodeSet.has(code);
}

export const ownerSignUpApiErrorCodes = [
  authApiErrorCode.validationError,
  authApiErrorCode.accountAlreadyExists,
  authApiErrorCode.profileSetupFailed,
] as const;

export type OwnerSignUpApiErrorCode =
  (typeof ownerSignUpApiErrorCodes)[number];

const ownerSignUpApiErrorCodeSet = new Set<string>(ownerSignUpApiErrorCodes);

export function isOwnerSignUpApiErrorCode(
  code: string | undefined,
): code is OwnerSignUpApiErrorCode {
  return typeof code === 'string' && ownerSignUpApiErrorCodeSet.has(code);
}
