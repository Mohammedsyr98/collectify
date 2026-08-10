import { z } from 'zod';

import { validationErrorCode } from './validation.js';

export const ownerLanguageSchema = z.enum(
  ['en', 'tr'],
  validationErrorCode.authPreferredLanguageUnsupported,
);
export const currencySchema = z.enum(
  ['TRY', 'USD', 'EUR'],
  validationErrorCode.authDefaultCurrencyUnsupported,
);

export const ownerProfileSchema = z.object({
  preferredLanguage: ownerLanguageSchema,
  defaultCurrency: currencySchema,
});

export type OwnerLanguage = z.infer<typeof ownerLanguageSchema>;
export type Currency = z.infer<typeof currencySchema>;
export type OwnerProfile = z.infer<typeof ownerProfileSchema>;
