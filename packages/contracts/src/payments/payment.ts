import { formatMoney, isMoneyWithinNumeric182Precision, parseMoney } from '@collectify/domain/money';
import { z } from 'zod';

import { moneySchema } from '../money.js';
import { paymentApiErrorCodes } from './api-error-codes.js';
import { paymentValidationCode } from './validation-codes.js';

const dateOnlySyntaxPattern = /^\d{4}-\d{2}-\d{2}$/;
const dateOnlySchema = z.string().regex(dateOnlySyntaxPattern, paymentValidationCode.paymentDateInvalid);

const paymentAmountSchema = z
  .string()
  .trim()
  .regex(/^\d+(?:\.\d{1,2})?$/, paymentValidationCode.paymentAmountInvalid)
  .refine(isMoneyWithinNumeric182Precision, paymentValidationCode.paymentAmountTooLarge)
  .transform((amount) => formatMoney(parseMoney(amount)))
  .refine((amount) => parseMoney(amount) > 0n, paymentValidationCode.paymentAmountInvalid);

const normalizedNoteSchema = z
  .union([z.string().trim(), z.null()])
  .refine((note) => note === null || note.length <= 500, paymentValidationCode.paymentNoteTooLong)
  .transform((note) => (note ? note : null));

export const recordPaymentRequestSchema = z
  .object({
    targetScheduleItemId: z.string().trim().min(1, paymentValidationCode.paymentTargetScheduleItemIdRequired),
    amount: paymentAmountSchema,
    paymentDate: dateOnlySchema,
    expectedDebtVersion: z.number().int().positive(paymentValidationCode.paymentExpectedDebtVersionInvalid),
    idempotencyKey: z.uuid(paymentValidationCode.paymentIdempotencyKeyInvalid),
    note: normalizedNoteSchema.optional().default(null),
  })
  .strict();

export const paymentSchema = z.object({
  id: z.string().min(1),
  scheduleItemId: z.string().min(1),
  amount: moneySchema,
  paymentDate: dateOnlySchema,
  note: z.string().nullable(),
  idempotencyKey: z.uuid(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const recordPaymentResponseSchema = z.object({
  payment: paymentSchema,
});

export const paymentErrorCodeSchema = z.enum(paymentApiErrorCodes);

export const paymentErrorResponseSchema = z.object({
  code: paymentErrorCodeSchema,
  message: z.string().min(1),
  fieldErrors: z.record(z.string(), z.array(z.string().min(1))).optional(),
});

export type RecordPaymentRequest = z.infer<typeof recordPaymentRequestSchema>;
export type Payment = z.infer<typeof paymentSchema>;
export type RecordPaymentResponse = z.infer<typeof recordPaymentResponseSchema>;
export type PaymentErrorCode = z.infer<typeof paymentErrorCodeSchema>;
export type PaymentErrorResponse = z.infer<typeof paymentErrorResponseSchema>;
