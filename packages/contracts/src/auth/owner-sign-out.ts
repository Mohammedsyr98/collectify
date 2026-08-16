import { z } from 'zod';

export const ownerSignOutResponseSchema = z.object({
  success: z.literal(true),
});

export type OwnerSignOutResponse = z.infer<typeof ownerSignOutResponseSchema>;
