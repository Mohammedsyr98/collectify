import { z } from 'zod';

import { paymentStateSchema, scheduleItemTimingSchema } from '../debts/debt.js';
import { currencySchema } from '../owner-profile/owner-profile.js';
import { oneBasedPageSchema } from '../pagination.js';
import { moneySchema } from '../money.js';

const dateOnlySyntaxPattern = /^\d{4}-\d{2}-\d{2}$/;
const dateOnlySchema = z.string().regex(dateOnlySyntaxPattern);

export const paymentTargetPageSize = 10;

export const eligiblePaymentStateSchema = paymentStateSchema.extract(['unpaid', 'partiallyPaid']);

export const paymentTargetPlanSchema = z.discriminatedUnion('type', [
  z
    .object({
      type: z.literal('onePayment'),
    })
    .strict(),
  z
    .object({
      type: z.literal('installment'),
      position: z.number().int().min(1),
    })
    .strict(),
]);

export const paymentTargetQuerySchema = z
  .object({
    page: oneBasedPageSchema,
    search: z.string().trim().optional(),
    paymentState: eligiblePaymentStateSchema.optional(),
  })
  .strict()
  .transform(({ page, search, paymentState }) => ({
    page,
    ...(search ? { search } : {}),
    ...(paymentState ? { paymentState } : {}),
  }));

export const paymentTargetSchema = z
  .object({
    scheduleItemId: z.string().min(1),
    debtId: z.string().min(1),
    debtDescription: z.string().min(1).max(200),
    currency: currencySchema,
    debtVersion: z.number().int().positive(),
    amount: moneySchema,
    remainingAmount: moneySchema,
    dueDate: dateOnlySchema,
    timing: scheduleItemTimingSchema,
    paymentState: eligiblePaymentStateSchema,
    plan: paymentTargetPlanSchema,
  })
  .strict();

export const paymentTargetListResponseSchema = z.object({
  items: z.array(paymentTargetSchema),
  page: z.number().int().min(1),
  pageSize: z.literal(paymentTargetPageSize),
  totalItems: z.number().int().min(0),
  totalPages: z.number().int().min(0),
});

export type EligiblePaymentState = z.infer<typeof eligiblePaymentStateSchema>;
export type PaymentTargetTiming = z.infer<typeof scheduleItemTimingSchema>;
export type PaymentTargetPlan = z.infer<typeof paymentTargetPlanSchema>;
export type PaymentTargetQuery = z.infer<typeof paymentTargetQuerySchema>;
export type PaymentTarget = z.infer<typeof paymentTargetSchema>;
export type PaymentTargetListResponse = z.infer<typeof paymentTargetListResponseSchema>;
