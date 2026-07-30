import { z } from 'zod';

export type HealthStatus = 'ok';
export type ServiceName = 'backend';

export interface HealthResponse {
  status: HealthStatus;
  service: ServiceName;
  timestamp: string;
  uptimeSeconds: number;
}

export const ownerLanguageSchema = z.enum(
  ['en', 'tr'],
  'Choose English or Turkish.',
);
export const currencySchema = z.enum(
  ['TRY', 'USD', 'EUR'],
  'Choose TRY, USD, or EUR.',
);

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

export const ownerSignUpRequestSchema = z.object({
  name: z.string().trim().min(1, 'Name is required.'),
  email: z
    .string()
    .trim()
    .email('Enter a valid email address.')
    .transform((email) => email.toLowerCase()),
  password: z
    .string()
    .min(8, 'Password must be between 8 and 128 characters.')
    .max(128, 'Password must be between 8 and 128 characters.'),
  preferredLanguage: ownerLanguageSchema,
  defaultCurrency: currencySchema,
});

export const ownerSignUpResponseSchema = z.object({
  authenticated: z.literal(true),
  user: sessionUserSchema,
  ownerProfile: ownerProfileSchema,
});

export const ownerSignUpFieldErrorsSchema = z
  .object({
    name: z.array(z.string().min(1)).optional(),
    email: z.array(z.string().min(1)).optional(),
    password: z.array(z.string().min(1)).optional(),
    preferredLanguage: z.array(z.string().min(1)).optional(),
    defaultCurrency: z.array(z.string().min(1)).optional(),
  })
  .strict();

export const ownerSignUpErrorCodeSchema = z.enum([
  'VALIDATION_ERROR',
  'ACCOUNT_ALREADY_EXISTS',
  'PROFILE_SETUP_FAILED',
]);

export const ownerSignUpErrorResponseSchema = z.object({
  code: ownerSignUpErrorCodeSchema,
  message: z.string().min(1),
  fieldErrors: ownerSignUpFieldErrorsSchema.optional(),
});

export type SessionUser = z.infer<typeof sessionUserSchema>;
export type OwnerProfile = z.infer<typeof ownerProfileSchema>;
export type SessionResponse = z.infer<typeof sessionResponseSchema>;
export type OwnerSignUpRequest = z.infer<typeof ownerSignUpRequestSchema>;
export type OwnerSignUpResponse = z.infer<typeof ownerSignUpResponseSchema>;
export type OwnerSignUpFieldErrors = z.infer<
  typeof ownerSignUpFieldErrorsSchema
>;
export type OwnerSignUpErrorCode = z.infer<typeof ownerSignUpErrorCodeSchema>;
export type OwnerSignUpErrorResponse = z.infer<
  typeof ownerSignUpErrorResponseSchema
>;
