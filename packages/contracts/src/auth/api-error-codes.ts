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
