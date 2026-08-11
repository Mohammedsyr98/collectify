import {
  isAuthApiErrorCode,
} from '@collectify/contracts';
import type { TFunction } from 'i18next';

import { getApiErrorDescription, isApiError } from '../../../shared/api/http';

export function getOwnerSignInApiErrorDescription(
  error: unknown,
  fallbackDescription: string,
  t: TFunction,
): string {
  return getKnownApiErrorDescription(error, fallbackDescription, t);
}

export function getOwnerSignUpApiErrorDescription(
  error: unknown,
  fallbackDescription: string,
  t: TFunction,
): string {
  return getKnownApiErrorDescription(error, fallbackDescription, t);
}

function getKnownApiErrorDescription(
  error: unknown,
  fallbackDescription: string,
  t: TFunction,
): string {
  if (!isApiError(error) || !isAuthApiErrorCode(error.code)) {
    return getApiErrorDescription(error, fallbackDescription);
  }

  return t(`auth.errors.${error.code}`);
}
