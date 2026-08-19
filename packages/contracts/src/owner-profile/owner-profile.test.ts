import { describe, expect, it } from 'vitest';

import { currencySchema, ownerLanguageSchema } from './owner-profile.js';

describe('owner profile contracts', () => {
  it('limits setup enums to supported owner profile values', () => {
    expect(ownerLanguageSchema.options).toEqual(['en', 'tr', 'ar']);
    expect(currencySchema.options).toEqual(['TRY', 'USD', 'EUR']);
  });
});
