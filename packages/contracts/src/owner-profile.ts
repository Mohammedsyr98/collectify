import { z } from 'zod';

export const ownerLanguageSchema = z.enum(
  ['en', 'tr'],
  'Choose English or Turkish.',
);
export const currencySchema = z.enum(
  ['TRY', 'USD', 'EUR'],
  'Choose TRY, USD, or EUR.',
);

export const ownerProfileSchema = z.object({
  preferredLanguage: ownerLanguageSchema,
  defaultCurrency: currencySchema,
});

export type OwnerLanguage = z.infer<typeof ownerLanguageSchema>;
export type Currency = z.infer<typeof currencySchema>;
export type OwnerProfile = z.infer<typeof ownerProfileSchema>;
