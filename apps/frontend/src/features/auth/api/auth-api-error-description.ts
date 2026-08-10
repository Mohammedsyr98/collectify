import type {
  OwnerSignInErrorCode,
  OwnerSignUpErrorCode,
} from '@collectify/contracts';
import type { TFunction } from 'i18next';

import { getApiErrorDescription, isApiError } from '../../../shared/api/http';

const signInErrorDescriptionKeys = {
  INVALID_CREDENTIALS: 'toast.auth.apiErrors.INVALID_CREDENTIALS',
  OWNER_PROFILE_MISSING: 'toast.auth.apiErrors.OWNER_PROFILE_MISSING',
  VALIDATION_ERROR: 'toast.auth.apiErrors.VALIDATION_ERROR',
} satisfies Record<OwnerSignInErrorCode, string>;

const signUpErrorDescriptionKeys = {
  ACCOUNT_ALREADY_EXISTS: 'toast.auth.apiErrors.ACCOUNT_ALREADY_EXISTS',
  PROFILE_SETUP_FAILED: 'toast.auth.apiErrors.PROFILE_SETUP_FAILED',
  VALIDATION_ERROR: 'toast.auth.apiErrors.VALIDATION_ERROR',
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
