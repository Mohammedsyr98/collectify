import { z } from 'zod';

import { customerApiErrorCodes } from './api-error-codes.js';
import { currencySchema } from '../owner-profile/owner-profile.js';
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

export const customerListPageSize = 25;

export const customerFinancialSummarySchema = z.object({
  totalDebtAmount: moneyAmountSchema,
  totalPaidAmount: moneyAmountSchema,
  balanceAmount: moneyAmountSchema,
});

export const customerListCurrencyBalanceSchema = z.object({
  currency: currencySchema,
  remainingAmount: moneyAmountSchema,
  overdueAmount: moneyAmountSchema,
});

export const customerListFinancialSummarySchema = z.object({
  balancesByCurrency: z.array(customerListCurrencyBalanceSchema),
  nextDueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
});

export const customerDetailsResponseSchema = customerSchema.extend({
  financialSummary: customerFinancialSummarySchema,
});

export const createCustomerResponseSchema = customerDetailsResponseSchema;

export const customerListItemSchema = customerSchema
  .omit({ address: true })
  .extend({
    financialSummary: customerListFinancialSummarySchema,
  });

export const customerListResponseSchema = z.object({
  items: z.array(customerListItemSchema),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
  totalItems: z.number().int().min(0),
  totalPages: z.number().int().min(0),
});

export const customerListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).catch(1),
    search: z.string().trim().optional(),
  })
  .transform(({ page, search }) =>
    search ? { page, search } : { page },
  );

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
export type CustomerListCurrencyBalance = z.infer<
  typeof customerListCurrencyBalanceSchema
>;
export type CustomerListFinancialSummary = z.infer<
  typeof customerListFinancialSummarySchema
>;
export type CustomerListItem = z.infer<typeof customerListItemSchema>;
export type CustomerListQuery = z.infer<typeof customerListQuerySchema>;
export type CustomerListResponse = z.infer<typeof customerListResponseSchema>;
export type CustomerFieldErrors = z.infer<typeof customerFieldErrorsSchema>;
export type CustomerErrorCode = z.infer<typeof customerErrorCodeSchema>;
export type CustomerErrorResponse = z.infer<typeof customerErrorResponseSchema>;
