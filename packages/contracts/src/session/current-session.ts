import { z } from 'zod';

import { ownerProfileSchema } from '../owner-profile/owner-profile.js';

export const sessionUserSchema = z.object({
  id: z.string().min(1),
  email: z.string().email(),
  name: z.string().nullable(),
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
export type SessionResponse = z.infer<typeof sessionResponseSchema>;
