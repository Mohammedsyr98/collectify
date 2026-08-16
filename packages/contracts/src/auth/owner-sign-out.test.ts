import { describe, expect, it } from 'vitest';

import { ownerSignOutResponseSchema } from './owner-sign-out.js';

describe('owner sign-out contracts', () => {
  it('accepts a successful owner sign-out response', () => {
    expect(
      ownerSignOutResponseSchema.parse({
        success: true,
      }),
    ).toEqual({
      success: true,
    });
  });

  it('rejects unsuccessful sign-out responses', () => {
    expect(() =>
      ownerSignOutResponseSchema.parse({
        success: false,
      }),
    ).toThrow();
  });
});
