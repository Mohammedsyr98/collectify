import { z } from 'zod';

import { authValidationCode } from '../auth/validation-codes.js';

export const ownerLanguageSchema = z.enum(
  ['en', 'tr', 'ar'],
  authValidationCode.authPreferredLanguageUnsupported,
);
export const currencySchema = z.enum(
  ['TRY', 'USD', 'EUR'],
  authValidationCode.authDefaultCurrencyUnsupported,
);

export const ownerProfileSchema = z.object({
  preferredLanguage: ownerLanguageSchema,
  defaultCurrency: currencySchema,
});

export type OwnerLanguage = z.infer<typeof ownerLanguageSchema>;
export type Currency = z.infer<typeof currencySchema>;
export type OwnerProfile = z.infer<typeof ownerProfileSchema>;
