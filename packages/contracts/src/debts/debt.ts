import { z } from 'zod';

import {
  debtPlanIssueCode,
  validateDebtPlan,
  type DebtPlan,
  type DebtPlanIssue,
} from '@collectify/domain/debt-plan';
import { currencySchema } from '../owner-profile/owner-profile.js';
import { oneBasedPageSchema } from '../pagination.js';
import { debtValidationCode } from './validation-codes.js';

const createDebtAmountSchema = z
  .string()
  .trim()
  .regex(/^\d+(?:\.\d{1,2})?$/, debtValidationCode.debtTotalAmountInvalid)
  .refine(isWithinNumeric182Precision, debtValidationCode.debtTotalAmountTooLarge)
  .transform((amount) => {
    const [wholeAmount, fractionalAmount = ''] = amount.split('.');
    const normalizedWholeAmount = wholeAmount.replace(/^0+(?=\d)/, '');

    return `${normalizedWholeAmount}.${fractionalAmount.padEnd(2, '0')}`;
  });

const createDebtTotalAmountSchema = createDebtAmountSchema.refine(
  isPositiveDebtAmount,
  debtValidationCode.debtTotalAmountMustBePositive,
);

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

const debtDueDateSchema = z
  .string()
  .min(1, debtValidationCode.debtDueDateRequired)
  .pipe(z.iso.date(debtValidationCode.debtDueDateInvalid));

const createScheduleItemSchema = z
  .object({
    amount: createDebtAmountSchema,
    dueDate: debtDueDateSchema,
  })
  .strict();

const replaceScheduleItemSchema = z
  .object({
    id: z.string().min(1).optional(),
    amount: createDebtAmountSchema,
    dueDate: debtDueDateSchema,
  })
  .strict();

const debtRequestFields = {
  description: z
    .string()
    .trim()
    .min(1, debtValidationCode.debtDescriptionRequired)
    .max(200, debtValidationCode.debtDescriptionTooLong),
  totalAmount: createDebtTotalAmountSchema,
  currency: currencySchema,
};

function buildDebtRequestSchema<T extends z.ZodType>(scheduleItemSchema: T) {
  return z
    .object({
      ...debtRequestFields,
      scheduleItems: z.tuple([scheduleItemSchema]),
    })
    .strict()
    .superRefine((request, context) => {
      const validation = validateDebtPlan({
        totalAmount: request.totalAmount,
        scheduleItems: request.scheduleItems as DebtPlan['scheduleItems'],
      });

      if (validation.success) {
        return;
      }

      for (const issue of validation.issues) {
        context.addIssue({
          code: 'custom',
          path: debtPlanIssuePath(issue),
          message: debtPlanIssueMessage(issue),
        });
      }
    });
}

export const createDebtRequestSchema = buildDebtRequestSchema(
  createScheduleItemSchema,
);
export const replaceDebtRequestSchema = buildDebtRequestSchema(
  replaceScheduleItemSchema,
);

function debtPlanIssuePath(issue: DebtPlanIssue): (string | number)[] {
  switch (issue.target.kind) {
    case 'schedule':
      return ['scheduleItems'];
    case 'totalAmount':
      return ['totalAmount'];
    case 'scheduleItemAmount':
      return ['scheduleItems', issue.target.index, 'amount'];
    case 'scheduleItemDueDate':
      return ['scheduleItems', issue.target.index, 'dueDate'];
    default:
      return assertNever(issue.target);
  }
}

function debtPlanIssueMessage(issue: DebtPlanIssue): string {
  switch (issue.code) {
    case debtPlanIssueCode.scheduleItemCountInvalid:
      return debtValidationCode.debtScheduleItemCountInvalid;
    case debtPlanIssueCode.totalAmountInvalid:
      return debtValidationCode.debtTotalAmountInvalid;
    case debtPlanIssueCode.scheduleItemAmountInvalid:
      return debtValidationCode.debtScheduleItemAmountInvalid;
    case debtPlanIssueCode.scheduleItemAmountNotPositive:
      return debtValidationCode.debtScheduleItemAmountMustBePositive;
    case debtPlanIssueCode.scheduleItemAmountDoesNotMatchTotal:
      return debtValidationCode.debtScheduleItemAmountDoesNotMatchTotal;
    case debtPlanIssueCode.scheduleItemDueDateInvalid:
      return debtValidationCode.debtDueDateInvalid;
    default:
      return assertNever(issue.code);
  }
}

function assertNever(value: never): never {
  throw new Error(`Unhandled debt plan value: ${String(value)}`);
}

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
  .transform(({ page, search }) => (search ? { page, search } : { page }));

export const debtListResponseSchema = z.object({
  items: z.array(debtResponseSchema),
  page: z.number().int().min(1),
  pageSize: z.literal(debtListPageSize),
  totalItems: z.number().int().min(0),
  totalPages: z.number().int().min(0),
});

export type CreateDebtRequest = z.infer<typeof createDebtRequestSchema>;
export type ReplaceDebtRequest = z.infer<typeof replaceDebtRequestSchema>;
export type DebtListQuery = z.infer<typeof debtListQuerySchema>;
export type DebtResponse = z.infer<typeof debtResponseSchema>;
export type DebtListResponse = z.infer<typeof debtListResponseSchema>;
