import { describe, expect, it } from 'vitest';

import { currencySchema, ownerLanguageSchema } from './owner-profile.js';

describe('owner profile contracts', () => {
  it('limits setup enums to v1 supported values', () => {
    expect(ownerLanguageSchema.options).toEqual(['en', 'tr']);
    expect(currencySchema.options).toEqual(['TRY', 'USD', 'EUR']);
  });
});
