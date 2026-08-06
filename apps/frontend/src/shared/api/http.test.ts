import { describe, expect, it } from 'vitest';

import { createApiError, getApiErrorDescription } from './http';

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
