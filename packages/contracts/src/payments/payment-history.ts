import { z } from 'zod';

import { currencySchema } from '../owner-profile/owner-profile.js';
import { moneySchema } from '../money.js';

const dateOnlySyntaxPattern = /^\d{4}-\d{2}-\d{2}$/;
const dateOnlySchema = z.string().regex(dateOnlySyntaxPattern);

export const paymentHistoryPageSize = 10;

export const paymentHistoryQuerySchema = z
  .object({
    cursor: z.string().trim().min(1).max(2048).optional(),
  })
  .strict();

export const paymentHistoryPlanSchema = z.discriminatedUnion('type', [
  z
    .object({
      type: z.literal('onePayment'),
    })
    .strict(),
  z
    .object({
      type: z.literal('installment'),
      position: z.number().int().min(1),
      total: z.number().int().min(2),
    })
    .strict(),
]);

export const paymentHistoryItemSchema = z
  .object({
    id: z.string().min(1),
    scheduleItemId: z.string().min(1),
    debtId: z.string().min(1),
    debtDescription: z.string().min(1).max(200),
    debtVersion: z.number().int().positive(),
    amount: moneySchema,
    maximumReplacementAmount: moneySchema,
    currency: currencySchema,
    paymentDate: dateOnlySchema,
    note: z.string().max(500).nullable(),
    plan: paymentHistoryPlanSchema,
  })
  .strict();

export const paymentHistoryListResponseSchema = z
  .object({
    items: z.array(paymentHistoryItemSchema).max(paymentHistoryPageSize),
    pageSize: z.literal(paymentHistoryPageSize),
    totalItems: z.number().int().min(0),
    nextCursor: z.string().min(1).nullable(),
  })
  .strict();

export type PaymentHistoryPlan = z.infer<typeof paymentHistoryPlanSchema>;
export type PaymentHistoryItem = z.infer<typeof paymentHistoryItemSchema>;
export type PaymentHistoryQuery = z.infer<typeof paymentHistoryQuerySchema>;
export type PaymentHistoryListResponse = z.infer<
  typeof paymentHistoryListResponseSchema
>;
