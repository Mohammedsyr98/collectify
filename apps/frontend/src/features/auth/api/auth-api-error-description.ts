import {
  authApiErrorCode,
  type OwnerSignInErrorCode,
  type OwnerSignUpErrorCode,
} from '@collectify/contracts';
import type { TFunction } from 'i18next';

import { getApiErrorDescription, isApiError } from '../../../shared/api/http';

const signInErrorDescriptionKeys = {
  [authApiErrorCode.invalidCredentials]:
    'toast.auth.apiErrors.INVALID_CREDENTIALS',
  [authApiErrorCode.ownerProfileMissing]:
    'toast.auth.apiErrors.OWNER_PROFILE_MISSING',
  [authApiErrorCode.validationError]: 'toast.auth.apiErrors.VALIDATION_ERROR',
} satisfies Record<OwnerSignInErrorCode, string>;

const signUpErrorDescriptionKeys = {
  [authApiErrorCode.accountAlreadyExists]:
    'toast.auth.apiErrors.ACCOUNT_ALREADY_EXISTS',
  [authApiErrorCode.profileSetupFailed]:
    'toast.auth.apiErrors.PROFILE_SETUP_FAILED',
  [authApiErrorCode.validationError]: 'toast.auth.apiErrors.VALIDATION_ERROR',
} satisfies Record<OwnerSignUpErrorCode, string>;

export function getOwnerSignInApiErrorDescription(
  error: unknown,
  fallbackDescription: string,
  t: TFunction,
): string {
  return getKnownApiErrorDescription(
    error,
    fallbackDescription,
    t,
    signInErrorDescriptionKeys,
  );
}

export function getOwnerSignUpApiErrorDescription(
  error: unknown,
  fallbackDescription: string,
  t: TFunction,
): string {
  return getKnownApiErrorDescription(
    error,
    fallbackDescription,
    t,
    signUpErrorDescriptionKeys,
  );
}

function getKnownApiErrorDescription(
  error: unknown,
  fallbackDescription: string,
  t: TFunction,
  descriptionKeys: Partial<Record<string, string>>,
): string {
  if (!isApiError(error) || !error.code) {
    return getApiErrorDescription(error, fallbackDescription);
  }

  const descriptionKey = descriptionKeys[error.code];

  if (!descriptionKey) {
    return getApiErrorDescription(error, fallbackDescription);
  }

  return t(descriptionKey);
}
