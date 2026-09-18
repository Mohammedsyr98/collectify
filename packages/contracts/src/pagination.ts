import { z } from 'zod';

const oneBasedPageErrorMessage = 'Page must be a positive safe integer.';

const positiveSafePageNumberSchema = z
  .number()
  .int()
  .min(1, oneBasedPageErrorMessage)
  .refine(Number.isSafeInteger, oneBasedPageErrorMessage);

const canonicalPositivePageStringSchema = z
  .string()
  .regex(/^[1-9]\d*$/, oneBasedPageErrorMessage)
  .refine((value) => Number.isSafeInteger(Number(value)), oneBasedPageErrorMessage)
  .transform(Number);

export const oneBasedPageSchema = z
  .union([positiveSafePageNumberSchema, canonicalPositivePageStringSchema])
  .optional()
  .default(1);

export type OneBasedPage = z.infer<typeof oneBasedPageSchema>;
