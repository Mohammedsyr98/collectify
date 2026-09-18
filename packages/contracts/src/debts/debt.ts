import { z } from 'zod';

import { currencySchema } from '../owner-profile/owner-profile.js';
import { oneBasedPageSchema } from '../pagination.js';
import { debtValidationCode } from './validation-codes.js';

const createDebtAmountSchema = z
  .string()
  .trim()
  .regex(
    /^\d+(?:\.\d{1,2})?$/,
    debtValidationCode.debtTotalAmountInvalid,
  )
  .refine(
    isPositiveDebtAmount,
    debtValidationCode.debtTotalAmountMustBePositive,
  )
  .refine(
    isWithinNumeric182Precision,
    debtValidationCode.debtTotalAmountTooLarge,
  )
  .transform((amount) => {
    const [wholeAmount, fractionalAmount = ''] = amount.split('.');
    const normalizedWholeAmount = wholeAmount.replace(/^0+(?=\d)/, '');

    return `${normalizedWholeAmount}.${fractionalAmount.padEnd(2, '0')}`;
  });

const canonicalDebtAmountSchema = z
  .string()
  .regex(/^\d+\.\d{2}$/)
  .refine(isPositiveDebtAmount)
  .refine(isWithinNumeric182Precision);

function isPositiveDebtAmount(amount: string): boolean {
  return /[1-9]/.test(amount);
}

function isWithinNumeric182Precision(amount: string): boolean {
  const [wholeAmount] = amount.split('.');
  const significantWholeAmount = wholeAmount.replace(/^0+(?=\d)/, '');

  return significantWholeAmount.length <= 16;
}

const onePaymentPlanSchema = z
  .object({
    type: z.literal('onePayment'),
    dueDate: z
      .string()
      .min(1, debtValidationCode.debtDueDateRequired)
      .pipe(z.iso.date(debtValidationCode.debtDueDateInvalid)),
  })
  .strict();

export const createDebtRequestSchema = z.object({
  description: z
    .string()
    .trim()
    .min(1, debtValidationCode.debtDescriptionRequired)
    .max(200, debtValidationCode.debtDescriptionTooLong),
  totalAmount: createDebtAmountSchema,
  currency: currencySchema,
  paymentPlan: onePaymentPlanSchema,
});

const onePaymentScheduleItemSchema = z.object({
  id: z.string().min(1),
  position: z.literal(1),
  amount: canonicalDebtAmountSchema,
  dueDate: z.iso.date(),
  timing: z.enum(['upcoming', 'dueToday', 'overdue']),
});

export const debtResponseSchema = z.object({
  id: z.string().min(1),
  customerId: z.string().min(1),
  description: z.string().min(1).max(200),
  totalAmount: canonicalDebtAmountSchema,
  currency: currencySchema,
  paymentPlanType: z.literal('onePayment'),
  scheduleItems: z.tuple([onePaymentScheduleItemSchema]),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const debtListPageSize = 5;

export const debtListQuerySchema = z
  .object({
    page: oneBasedPageSchema,
    search: z.string().trim().optional(),
  })
  .transform(({ page, search }) =>
    search ? { page, search } : { page },
  );

export const debtListResponseSchema = z.object({
  items: z.array(debtResponseSchema),
  page: z.number().int().min(1),
  pageSize: z.literal(debtListPageSize),
  totalItems: z.number().int().min(0),
  totalPages: z.number().int().min(0),
});

export type CreateDebtRequest = z.infer<typeof createDebtRequestSchema>;
export type DebtListQuery = z.infer<typeof debtListQuerySchema>;
export type DebtResponse = z.infer<typeof debtResponseSchema>;
export type DebtListResponse = z.infer<typeof debtListResponseSchema>;
