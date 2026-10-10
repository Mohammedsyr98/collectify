import { z } from 'zod';

import {
  debtPlanIssueCode,
  validateDebtPlan,
  type DebtPlanIssue,
} from '@collectify/domain/debt-plan';
import { currencySchema } from '../owner-profile/owner-profile.js';
import { oneBasedPageSchema } from '../pagination.js';
import {
  debtRequestValidationCode,
  type DebtValidationCode,
} from './validation-codes.js';

function createDebtAmountSchema(invalidCode: string, tooLargeCode: string) {
  return z
    .string()
    .trim()
    .regex(/^\d+(?:\.\d{1,2})?$/, invalidCode)
    .refine(isWithinNumeric182Precision, tooLargeCode)
    .transform((amount) => {
      const [wholeAmount, fractionalAmount = ''] = amount.split('.');
      const normalizedWholeAmount = wholeAmount.replace(/^0+(?=\d)/, '');

      return `${normalizedWholeAmount}.${fractionalAmount.padEnd(2, '0')}`;
    });
}

export const debtTotalAmountSchema = createDebtAmountSchema(
  debtRequestValidationCode.debtTotalAmountInvalid,
  debtRequestValidationCode.debtTotalAmountTooLarge,
);
export const debtScheduleItemAmountSchema = createDebtAmountSchema(
  debtRequestValidationCode.debtScheduleItemAmountInvalid,
  debtRequestValidationCode.debtTotalAmountTooLarge,
);
const canonicalDebtAmountSchema = z
  .string()
  .regex(/^\d+\.\d{2}$/)
  .refine(isWithinNumeric182Precision);
const dateOnlySyntaxPattern = /^\d{4}-\d{2}-\d{2}$/;
const dateOnlySyntaxSchema = z.string().regex(dateOnlySyntaxPattern);

export const debtDueDateSchema = z
  .string()
  .min(1, debtRequestValidationCode.debtDueDateRequired)
  .regex(dateOnlySyntaxPattern, debtRequestValidationCode.debtDueDateInvalid);

export const debtDescriptionSchema = z
  .string()
  .trim()
  .min(1, debtRequestValidationCode.debtDescriptionRequired)
  .max(200, debtRequestValidationCode.debtDescriptionTooLong);

function isWithinNumeric182Precision(amount: string): boolean {
  const [wholeAmount] = amount.split('.');
  const significantWholeAmount = wholeAmount.replace(/^0+(?=\d)/, '');

  return significantWholeAmount.length <= 16;
}

const createScheduleItemSchema = z
  .object({
    amount: debtScheduleItemAmountSchema,
    dueDate: debtDueDateSchema,
  })
  .strict();

const replaceScheduleItemSchema = z
  .object({
    id: z.string().min(1).optional(),
    amount: debtScheduleItemAmountSchema,
    dueDate: debtDueDateSchema,
  })
  .strict();

const debtRequestFields = {
  description: debtDescriptionSchema,
  totalAmount: debtTotalAmountSchema,
  currency: currencySchema,
};

type RequestScheduleItem = {
  amount: string;
  dueDate: string;
};

function buildDebtRequestSchema<T extends z.ZodType<RequestScheduleItem>>(
  scheduleItemSchema: T,
  options: {
    readonly onePaymentOnly?: boolean;
    readonly expectedVersion?: z.ZodType<number>;
  } = {},
) {
  const scheduleItemsSchema = z
    .array(scheduleItemSchema)
    .refine(
      (scheduleItems) =>
        !options.onePaymentOnly || scheduleItems.length === 1,
      debtPlanIssueCode.scheduleItemCountInvalid,
    );
  const structuralSchema = z
    .object({
      ...debtRequestFields,
      ...(options.expectedVersion
        ? { expectedVersion: options.expectedVersion }
        : {}),
      scheduleItems: scheduleItemsSchema,
    })
    .strict();

  return structuralSchema
    .pipe(
      z
        .custom<z.output<typeof structuralSchema>>()
        .superRefine((request, context) => {
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
        }),
    )
    .transform((request) => ({
      ...request,
      scheduleItems: request.scheduleItems,
    }));
}

export const createDebtRequestSchema = buildDebtRequestSchema(
  createScheduleItemSchema,
);
export const replaceDebtRequestSchema = buildDebtRequestSchema(
  replaceScheduleItemSchema,
  {
    expectedVersion: z.number().int().positive(),
  },
).superRefine((request, context) => {
  const submittedIds = request.scheduleItems
    .map(({ id }) => id)
    .filter((id): id is string => id !== undefined);

  if (new Set(submittedIds).size !== submittedIds.length) {
    context.addIssue({
      code: 'custom',
      path: ['scheduleItems'],
      message: debtRequestValidationCode.debtScheduleItemIdDuplicate,
    });
  }
});

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

function debtPlanIssueMessage(issue: DebtPlanIssue): DebtValidationCode {
  return issue.code;
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

const installmentScheduleItemSchema = z.object({
  id: z.string().min(1),
  position: z.number().int().min(1),
  amount: canonicalDebtAmountSchema,
  dueDate: dateOnlySyntaxSchema,
  timing: z.enum(['upcoming', 'dueToday', 'overdue']),
});

const installmentScheduleItemsSchema = z
  .array(installmentScheduleItemSchema)
  .min(2)
  .max(60)
  .superRefine((scheduleItems, context) => {
    for (const [index, scheduleItem] of scheduleItems.entries()) {
      if (scheduleItem.position !== index + 1) {
        context.addIssue({
          code: 'custom',
          path: [index, 'position'],
          message: 'Schedule item positions must be contiguous',
        });
      }
    }
  });

const debtResponseFields = {
  id: z.string().min(1),
  customerId: z.string().min(1),
  description: z.string().min(1).max(200),
  totalAmount: canonicalDebtAmountSchema,
  currency: currencySchema,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  version: z.number().int().positive(),
};

const onePaymentDebtResponseSchema = z.object({
  ...debtResponseFields,
  paymentPlanType: z.literal('onePayment'),
  scheduleItems: z.tuple([onePaymentScheduleItemSchema]),
});

const installmentDebtResponseSchema = z.object({
  ...debtResponseFields,
  paymentPlanType: z.literal('installment'),
  scheduleItems: installmentScheduleItemsSchema,
});

export const debtResponseSchema = z.discriminatedUnion('paymentPlanType', [
  onePaymentDebtResponseSchema,
  installmentDebtResponseSchema,
]);

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
