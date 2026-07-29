import { z } from 'zod';

export type HealthStatus = 'ok';
export type ServiceName = 'backend';

export interface HealthResponse {
  status: HealthStatus;
  service: ServiceName;
  timestamp: string;
  uptimeSeconds: number;
}

export const ownerLanguageSchema = z.enum(['en', 'tr']);
export const currencySchema = z.enum(['TRY', 'USD', 'EUR']);

export type OwnerLanguage = z.infer<typeof ownerLanguageSchema>;
export type Currency = z.infer<typeof currencySchema>;

export const sessionUserSchema = z.object({
  id: z.string().min(1),
  email: z.string().email(),
  name: z.string().nullable(),
});

export const ownerProfileSchema = z.object({
  preferredLanguage: ownerLanguageSchema,
  defaultCurrency: currencySchema,
});

export const sessionResponseSchema = z.discriminatedUnion('authenticated', [
  z.object({
    authenticated: z.literal(false),
    user: z.null(),
    ownerProfile: z.null(),
  }),
  z.object({
    authenticated: z.literal(true),
    user: sessionUserSchema,
    ownerProfile: ownerProfileSchema.nullable(),
  }),
]);

export type SessionUser = z.infer<typeof sessionUserSchema>;
export type OwnerProfile = z.infer<typeof ownerProfileSchema>;
export type SessionResponse = z.infer<typeof sessionResponseSchema>;
