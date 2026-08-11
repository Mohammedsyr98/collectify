import { describe, expect, it } from 'vitest';

import {
  createApiError,
  createApiErrorFromResponseBody,
  getApiErrorDescription,
  resolveApiErrorDescription,
} from './http';

describe('getApiErrorDescription', () => {
  it('returns the fallback description for unknown errors', () => {
    expect(getApiErrorDescription(new Error('Network down'), 'Try again.')).toBe(
      'Try again.',
    );
  });

  it('returns the API error message when there are no field errors', () => {
    const error = createApiError('Unable to process request.', {
      status: 500,
    });

    expect(getApiErrorDescription(error, 'Try again.')).toBe(
      'Unable to process request.',
    );
  });

  it('prefers unique non-empty field errors over the API error message', () => {
    const error = createApiError('Validation failed.', {
      fieldErrors: {
        email: ['Enter a valid email address.', 'Enter a valid email address.'],
        password: ['Password is required.', ''],
      },
      status: 400,
    });

    expect(getApiErrorDescription(error, 'Try again.')).toBe(
      'Enter a valid email address. Password is required.',
    );
  });

  it('returns the fallback description for API errors without a message', () => {
    const error = createApiError('', {
      status: 500,
    });

    expect(getApiErrorDescription(error, 'Try again.')).toBe('Try again.');
  });
});

describe('createApiErrorFromResponseBody', () => {
  it('preserves failed API responses with unknown string codes', () => {
    const error = createApiErrorFromResponseBody(
      {
        code: 'FUTURE_AUTH_RULE',
        message: 'Backend fallback message.',
        fieldErrors: {
          email: ['Backend field detail.'],
        },
      },
      {
        status: 409,
      },
    );

    expect(error).toMatchObject({
      code: 'FUTURE_AUTH_RULE',
      fieldErrors: {
        email: ['Backend field detail.'],
      },
      message: 'Backend fallback message.',
      status: 409,
    });
  });

  it('uses a message-less ApiError for malformed failed API responses', () => {
    const error = createApiErrorFromResponseBody(
      {
        message: 'Missing a string code.',
      },
      {
        status: 500,
      },
    );

    expect(error).toMatchObject({
      message: '',
      status: 500,
    });
    expect(error.code).toBeUndefined();
    expect(error.fieldErrors).toBeUndefined();
  });
});

describe('resolveApiErrorDescription', () => {
  const isKnownCode = (code: string | undefined): code is 'KNOWN_CODE' =>
    code === 'KNOWN_CODE';

  it('uses localized copy for known API error codes', () => {
    const error = createApiError('Backend message.', {
      code: 'KNOWN_CODE',
      status: 409,
    });

    expect(
      resolveApiErrorDescription(error, {
        describeKnownCode: (code) => `Localized ${code}.`,
        fallbackDescription: 'Try again.',
        isKnownCode,
      }),
    ).toBe('Localized KNOWN_CODE.');
  });

  it('uses the backend top-level message for unknown string codes', () => {
    const error = createApiError('Backend fallback message.', {
      code: 'FUTURE_AUTH_RULE',
      fieldErrors: {
        email: ['Backend field detail.'],
      },
      status: 409,
    });

    expect(
      resolveApiErrorDescription(error, {
        describeKnownCode: (code) => `Localized ${code}.`,
        fallbackDescription: 'Try again.',
        isKnownCode,
      }),
    ).toBe('Backend fallback message.');
  });

  it('uses the safe fallback for API errors without a code', () => {
    const error = createApiError('Internal parser fallback.', {
      status: 500,
    });

    expect(
      resolveApiErrorDescription(error, {
        describeKnownCode: (code) => `Localized ${code}.`,
        fallbackDescription: 'Try again.',
        isKnownCode,
      }),
    ).toBe('Try again.');
  });

  it('uses the safe fallback for non-API errors', () => {
    expect(
      resolveApiErrorDescription(new Error('Network down'), {
        describeKnownCode: (code) => `Localized ${code}.`,
        fallbackDescription: 'Try again.',
        isKnownCode,
      }),
    ).toBe('Try again.');
  });
});
