import { z } from 'zod';

import { ownerProfileSchema } from '../owner-profile/owner-profile.js';
import { sessionUserSchema } from '../session/current-session.js';
import { authApiErrorCode } from './api-error-codes.js';
import { authValidationCode } from './validation-codes.js';

export const ownerSignInRequestSchema = z.object({
  email: z
    .string()
    .trim()
    .email(authValidationCode.authEmailInvalid)
    .transform((email) => email.toLowerCase()),
  password: z.string().min(1, authValidationCode.authSignInPasswordRequired),
});

export const ownerSignInResponseSchema = z.object({
  authenticated: z.literal(true),
  user: sessionUserSchema,
  ownerProfile: ownerProfileSchema,
});

export const ownerSignInFieldErrorsSchema = z
  .object({
    email: z.array(z.string().min(1)).optional(),
    password: z.array(z.string().min(1)).optional(),
  })
  .strict();

export const ownerSignInApiErrorCodes = [
  authApiErrorCode.validationError,
  authApiErrorCode.invalidCredentials,
  authApiErrorCode.ownerProfileMissing,
] as const;

export type OwnerSignInApiErrorCode =
  (typeof ownerSignInApiErrorCodes)[number];

const ownerSignInApiErrorCodeSet = new Set<string>(ownerSignInApiErrorCodes);

export function isOwnerSignInApiErrorCode(
  code: string | undefined,
): code is OwnerSignInApiErrorCode {
  return typeof code === 'string' && ownerSignInApiErrorCodeSet.has(code);
}

export const ownerSignInErrorCodeSchema = z.enum(ownerSignInApiErrorCodes);

export const ownerSignInErrorResponseSchema = z.object({
  code: ownerSignInErrorCodeSchema,
  message: z.string().min(1),
  fieldErrors: ownerSignInFieldErrorsSchema.optional(),
});

export type OwnerSignInRequest = z.infer<typeof ownerSignInRequestSchema>;
export type OwnerSignInResponse = z.infer<typeof ownerSignInResponseSchema>;
export type OwnerSignInFieldErrors = z.infer<
  typeof ownerSignInFieldErrorsSchema
>;
export type OwnerSignInErrorCode = z.infer<typeof ownerSignInErrorCodeSchema>;
export type OwnerSignInErrorResponse = z.infer<
  typeof ownerSignInErrorResponseSchema
>;
