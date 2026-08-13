import { z } from 'zod';

import {
  currencySchema,
  ownerLanguageSchema,
  ownerProfileSchema,
} from '../owner-profile/owner-profile.js';
import { sessionUserSchema } from '../session/current-session.js';
import { authApiErrorCode } from './api-error-codes.js';
import { authValidationCode } from './validation-codes.js';

export const ownerSignUpRequestSchema = z.object({
  name: z.string().trim().min(1, authValidationCode.authNameRequired),
  email: z
    .string()
    .trim()
    .email(authValidationCode.authEmailInvalid)
    .transform((email) => email.toLowerCase()),
  password: z
    .string()
    .min(8, authValidationCode.authSignUpPasswordLength)
    .max(128, authValidationCode.authSignUpPasswordLength),
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

export const ownerSignUpApiErrorCodes = [
  authApiErrorCode.validationError,
  authApiErrorCode.accountAlreadyExists,
  authApiErrorCode.profileSetupFailed,
] as const;

export type OwnerSignUpApiErrorCode =
  (typeof ownerSignUpApiErrorCodes)[number];

const ownerSignUpApiErrorCodeSet = new Set<string>(ownerSignUpApiErrorCodes);

export function isOwnerSignUpApiErrorCode(
  code: string | undefined,
): code is OwnerSignUpApiErrorCode {
  return typeof code === 'string' && ownerSignUpApiErrorCodeSet.has(code);
}

export const ownerSignUpErrorCodeSchema = z.enum(ownerSignUpApiErrorCodes);

export const ownerSignUpErrorResponseSchema = z.object({
  code: ownerSignUpErrorCodeSchema,
  message: z.string().min(1),
  fieldErrors: ownerSignUpFieldErrorsSchema.optional(),
});

export type OwnerSignUpRequest = z.infer<typeof ownerSignUpRequestSchema>;
export type OwnerSignUpResponse = z.infer<typeof ownerSignUpResponseSchema>;
export type OwnerSignUpFieldErrors = z.infer<
  typeof ownerSignUpFieldErrorsSchema
>;
export type OwnerSignUpErrorCode = z.infer<typeof ownerSignUpErrorCodeSchema>;
export type OwnerSignUpErrorResponse = z.infer<
  typeof ownerSignUpErrorResponseSchema
>;
