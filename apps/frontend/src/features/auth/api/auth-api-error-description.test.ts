import { describe, expect, it } from 'vitest';

import { createAppI18nInstance } from '../../../app/localization/i18n';
import { createApiError } from '../../../shared/api/http';
import {
  getOwnerSignInApiErrorDescription,
  getOwnerSignUpApiErrorDescription,
} from './auth-api-error-description';

describe('auth API error descriptions', () => {
  it('exposes auth API error translations through direct semantic keys', () => {
    const englishI18n = createAppI18nInstance('en');
    const turkishI18n = createAppI18nInstance('tr');

    expect(englishI18n.t('auth.errors.INVALID_CREDENTIALS')).toBe(
      'Email or password is incorrect.',
    );
    expect(turkishI18n.t('auth.errors.ACCOUNT_ALREADY_EXISTS')).toBe(
      'Bu e-posta adresiyle zaten bir hesap var.',
    );
  });

  it('uses localized copy for known sign-in error codes', () => {
    const i18n = createAppI18nInstance('tr');
    const error = createApiError('Email or password is incorrect.', {
      code: 'INVALID_CREDENTIALS',
      fieldErrors: {
        email: ['Email or password is incorrect.'],
      },
      status: 401,
    });

    expect(
      getOwnerSignInApiErrorDescription(error, 'Try again.', i18n.t),
    ).toBe('E-posta veya \u015fifre hatal\u0131.');
  });

  it('uses localized copy for known sign-up error codes', () => {
    const i18n = createAppI18nInstance('tr');
    const error = createApiError('An account already exists for this email.', {
      code: 'ACCOUNT_ALREADY_EXISTS',
      fieldErrors: {
        email: ['An account already exists for this email.'],
      },
      status: 409,
    });

    expect(
      getOwnerSignUpApiErrorDescription(error, 'Try again.', i18n.t),
    ).toBe('Bu e-posta adresiyle zaten bir hesap var.');
  });

  it('falls back to existing API descriptions for unknown codes', () => {
    const i18n = createAppI18nInstance('tr');
    const error = createApiError('Backend fallback message.', {
      code: 'SOMETHING_ELSE',
      fieldErrors: {
        email: ['Backend field detail.'],
      },
      status: 409,
    });

    expect(
      getOwnerSignUpApiErrorDescription(error, 'Try again.', i18n.t),
    ).toBe('Backend field detail.');
  });

  it('falls back to safe descriptions for non-API errors', () => {
    const i18n = createAppI18nInstance('tr');

    expect(
      getOwnerSignInApiErrorDescription(
        new Error('Network down'),
        'Try again.',
        i18n.t,
      ),
    ).toBe('Try again.');
  });
});
