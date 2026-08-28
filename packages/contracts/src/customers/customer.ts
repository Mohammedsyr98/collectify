import { z } from 'zod';

import { customerApiErrorCodes } from './api-error-codes.js';
import { customerValidationCode } from './validation-codes.js';

export const createCustomerRequestSchema = z.object({
  name: z.string().trim().min(1, customerValidationCode.customerNameRequired),
  code: z.string().trim().min(1, customerValidationCode.customerCodeRequired),
  phoneNumber: z
    .string()
    .trim()
    .min(1, customerValidationCode.customerPhoneNumberRequired),
  address: z
    .string()
    .trim()
    .optional()
    .transform((address) => (address ? address : undefined)),
});

export const customerSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  code: z.string().min(1),
  phoneNumber: z.string().min(1),
  address: z.string().min(1).nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const moneyAmountSchema = z.string().regex(/^-?\d+(\.\d{2})$/);

export const customerFinancialSummarySchema = z.object({
  totalDebtAmount: moneyAmountSchema,
  totalPaidAmount: moneyAmountSchema,
  balanceAmount: moneyAmountSchema,
});

export const customerDetailsResponseSchema = customerSchema.extend({
  financialSummary: customerFinancialSummarySchema,
});

export const createCustomerResponseSchema = customerDetailsResponseSchema;

export const customerFieldErrorsSchema = z
  .object({
    name: z.array(z.string().min(1)).optional(),
    code: z.array(z.string().min(1)).optional(),
    phoneNumber: z.array(z.string().min(1)).optional(),
    address: z.array(z.string().min(1)).optional(),
  })
  .strict();

export const customerErrorCodeSchema = z.enum(customerApiErrorCodes);

export const customerErrorResponseSchema = z.object({
  code: customerErrorCodeSchema,
  message: z.string().min(1),
  fieldErrors: customerFieldErrorsSchema.optional(),
});

export type CreateCustomerRequest = z.infer<typeof createCustomerRequestSchema>;
export type Customer = z.infer<typeof customerSchema>;
export type CustomerFinancialSummary = z.infer<typeof customerFinancialSummarySchema>;
export type CustomerDetailsResponse = z.infer<typeof customerDetailsResponseSchema>;
export type CreateCustomerResponse = z.infer<typeof createCustomerResponseSchema>;
export type CustomerFieldErrors = z.infer<typeof customerFieldErrorsSchema>;
export type CustomerErrorCode = z.infer<typeof customerErrorCodeSchema>;
export type CustomerErrorResponse = z.infer<typeof customerErrorResponseSchema>;
