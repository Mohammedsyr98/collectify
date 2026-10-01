import { z } from 'zod';

import {
  debtPlanIssueCode,
  validateDebtPlan,
  type DebtPlanIssue,
} from '@collectify/domain/debt-plan';
import { currencySchema } from '../owner-profile/owner-profile.js';
import { oneBasedPageSchema } from '../pagination.js';
import { debtValidationCode } from './validation-codes.js';

function createDebtAmountSchema(invalidCode: string) {
  return z
    .string()
    .trim()
    .regex(/^\d+(?:\.\d{1,2})?$/, invalidCode)
    .transform((amount) => {
      const [wholeAmount, fractionalAmount = ''] = amount.split('.');
      const normalizedWholeAmount = wholeAmount.replace(/^0+(?=\d)/, '');

      return `${normalizedWholeAmount}.${fractionalAmount.padEnd(2, '0')}`;
    });
}

const createDebtTotalAmountSchema = createDebtAmountSchema(
  debtValidationCode.debtTotalAmountInvalid,
);
const createDebtScheduleAmountSchema = createDebtAmountSchema(
  debtValidationCode.debtScheduleItemAmountInvalid,
);
const canonicalDebtAmountSchema = z.string().regex(/^\d+\.\d{2}$/);
const dateOnlySyntaxPattern = /^\d{4}-\d{2}-\d{2}$/;
const dateOnlySyntaxSchema = z.string().regex(dateOnlySyntaxPattern);

const debtDueDateSchema = z
  .string()
  .min(1, debtValidationCode.debtDueDateRequired)
  .regex(dateOnlySyntaxPattern, debtValidationCode.debtDueDateInvalid);

const createScheduleItemSchema = z
  .object({
    amount: createDebtScheduleAmountSchema,
    dueDate: debtDueDateSchema,
  })
  .strict();

const replaceScheduleItemSchema = z
  .object({
    id: z.string().min(1).optional(),
    amount: createDebtScheduleAmountSchema,
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

type RequestScheduleItem = {
  amount: string;
  dueDate: string;
};

function buildDebtRequestSchema<T extends z.ZodType<RequestScheduleItem>>(
  scheduleItemSchema: T,
) {
  const structuralSchema = z
    .object({
      ...debtRequestFields,
      scheduleItems: z.array(scheduleItemSchema),
    })
    .strict();

  return structuralSchema
    .pipe(
      z
        .any()
        .superRefine(
          (request: z.output<typeof structuralSchema>, context) => {
            const validation = validateDebtPlan({
              totalAmount: request.totalAmount,
              scheduleItems: request.scheduleItems,
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
          },
        )
        .transform((request) => request as z.output<typeof structuralSchema>),
    )
    .transform((request) => ({
      ...request,
      scheduleItems: [request.scheduleItems[0]!] as [z.output<T>],
    }));
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
  dueDate: dateOnlySyntaxSchema,
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
