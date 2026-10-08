import { z } from 'zod';

import {
  currencySchema,
  debtDescriptionSchema,
  debtDueDateSchema,
  debtScheduleItemAmountSchema,
  debtTotalAmountSchema,
  debtPlanIssueCode,
  type CreateDebtRequest,
  type Currency,
  type DebtResponse,
} from '@collectify/contracts';
import {
  generateInstallmentSchedule,
  getMaximumInstallmentCount,
  isValidDateOnly,
  validateDebtPlan,
  type DebtPlan,
} from '@collectify/domain/debt-plan';

const debtDraftInputSchema = z.object({
  description: z.string(),
  totalAmount: z.string(),
  currency: currencySchema,
  paymentPlan: z.enum(['onePayment', 'installment']),
  onePayment: z.object({
    dueDate: z.string(),
  }),
  installmentPlan: z.object({
    mode: z.enum(['automatic', 'manual']),
    automatic: z.object({
      installmentCount: z.string(),
      frequency: z.enum(['weekly', 'monthly']),
      firstInstallmentDueDate: z.string(),
    }),
    manual: z.object({
      scheduleItems: z.array(
        z.object({
          amount: z.string(),
          dueDate: z.string(),
        }),
      ),
    }),
  }),
});

const descriptionDraftSchema = z.object({
  description: debtDescriptionSchema,
});

export type DebtDraft = z.input<typeof debtDraftInputSchema>;

export function createDebtDraft(
  source:
    | { readonly mode: 'create'; readonly defaultCurrency: Currency }
    | { readonly mode: 'edit'; readonly debt: DebtResponse },
): DebtDraft {
  return {
    description: source.mode === 'edit' ? source.debt.description : '',
    totalAmount: source.mode === 'edit' ? source.debt.totalAmount : '',
    currency: source.mode === 'edit' ? source.debt.currency : source.defaultCurrency,
    paymentPlan: 'onePayment',
    onePayment: {
      dueDate: source.mode === 'edit' ? (source.debt.scheduleItems[0]?.dueDate ?? '') : '',
    },
    installmentPlan: {
      mode: 'automatic',
      automatic: {
        installmentCount: '2',
        frequency: 'monthly',
        firstInstallmentDueDate: '',
      },
      manual: {
        scheduleItems: [],
      },
    },
  };
}

export const debtDraftSchema = debtDraftInputSchema.transform((draft, context) => {
  const description = descriptionDraftSchema.safeParse(draft);
  const debtPlan =
    draft.paymentPlan === 'onePayment'
      ? onePaymentPlanSchema.safeParse(draft)
      : draft.installmentPlan.mode === 'automatic'
        ? automaticPlanSchema.safeParse(draft)
        : manualPlanSchema.safeParse(draft);

  for (const result of [description, debtPlan]) {
    if (result.success) {
      continue;
    }

    for (const issue of result.error.issues) {
      context.addIssue({
        code: 'custom',
        path: [...issue.path],
        message: issue.message,
      });
    }
  }

  if (!description.success || !debtPlan.success) {
    return z.NEVER;
  }

  return {
    description: description.data.description,
    totalAmount: debtPlan.data.totalAmount,
    currency: draft.currency,
    scheduleItems: debtPlan.data.scheduleItems,
  } satisfies CreateDebtRequest;
});

type AutomaticSchedulePreviewDraft = {
  readonly totalAmount: string;
  readonly automatic: DebtDraft['installmentPlan']['automatic'];
};

type AutomaticSchedulePreview = {
  readonly maximumInstallmentCount: number;
  readonly scheduleItems: DebtPlan['scheduleItems'];
};

export function buildAutomaticSchedulePreview(
  draft: AutomaticSchedulePreviewDraft,
): AutomaticSchedulePreview | undefined {
  const schedule = automaticPlanSchema.safeParse({
    totalAmount: draft.totalAmount,
    installmentPlan: { automatic: draft.automatic },
  });

  if (!schedule.success) {
    return undefined;
  }

  return {
    maximumInstallmentCount: schedule.data.maximumInstallmentCount,
    scheduleItems: schedule.data.scheduleItems,
  };
}

type DebtScheduleItems = CreateDebtRequest['scheduleItems'];
type ParsedDebtPlan = {
  readonly totalAmount: string;
  readonly scheduleItems: DebtScheduleItems;
};

const onePaymentPlanSchema = z
  .object({
    totalAmount: debtTotalAmountSchema,
    onePayment: z.object({
      dueDate: debtDueDateSchema,
    }),
  })
  .transform(({ onePayment, totalAmount }): ParsedDebtPlan => ({
    totalAmount,
    scheduleItems: [{ amount: totalAmount, dueDate: onePayment.dueDate }],
  }))
  .superRefine((plan, context) => {
    addDomainIssues(context, validateDebtPlan(plan), 'onePayment');
  });

const installmentCountSchema = z
  .string()
  .regex(/^\d+$/, debtPlanIssueCode.scheduleItemCountInvalid)
  .transform(Number)
  .refine(
    (installmentCount) => Number.isSafeInteger(installmentCount) && installmentCount >= 2,
    debtPlanIssueCode.scheduleItemCountInvalid,
  );

const automaticPlanSchema = z
  .object({
    totalAmount: debtTotalAmountSchema,
    installmentPlan: z.object({
      automatic: z.object({
        installmentCount: installmentCountSchema,
        frequency: z.enum(['weekly', 'monthly']),
        firstInstallmentDueDate: debtDueDateSchema.refine(
          isValidDateOnly,
          debtPlanIssueCode.scheduleItemDueDateInvalid,
        ),
      }),
    }),
  })
  .transform((draft) => ({
    ...draft,
    maximumInstallmentCount: getMaximumInstallmentCount(draft.totalAmount),
  }))
  .refine(
    (draft) => draft.installmentPlan.automatic.installmentCount <= draft.maximumInstallmentCount,
    {
      path: ['installmentPlan', 'automatic', 'installmentCount'],
      message: debtPlanIssueCode.scheduleItemCountInvalid,
    },
  )
  .transform((draft) => {
    const { installmentCount, frequency, firstInstallmentDueDate } =
      draft.installmentPlan.automatic;

    return {
      totalAmount: draft.totalAmount,
      maximumInstallmentCount: draft.maximumInstallmentCount,
      scheduleItems: [
        ...generateInstallmentSchedule({
          totalAmount: draft.totalAmount,
          installmentCount,
          frequency,
          firstInstallmentDueDate,
        }),
      ],
    };
  })
  .refine((schedule) => schedule.scheduleItems.every(({ dueDate }) => isValidDateOnly(dueDate)), {
    path: ['installmentPlan', 'automatic', 'firstInstallmentDueDate'],
    message: debtPlanIssueCode.scheduleItemDueDateInvalid,
  });

const manualPlanSchema = z
  .object({
    totalAmount: debtTotalAmountSchema,
    installmentPlan: z.object({
      manual: z.object({
        scheduleItems: z.array(
          z.object({
            amount: debtScheduleItemAmountSchema,
            dueDate: debtDueDateSchema,
          }),
        ),
      }),
    }),
  })
  .transform(({ installmentPlan, totalAmount }): ParsedDebtPlan => ({
    totalAmount,
    scheduleItems: installmentPlan.manual.scheduleItems,
  }))
  .superRefine((plan, context) => {
    addDomainIssues(context, validateDebtPlan(plan), 'manual');
  });

function addDomainIssues(
  context: z.RefinementCtx,
  validation: ReturnType<typeof validateDebtPlan>,
  branch: 'onePayment' | 'manual',
) {
  if (validation.success) {
    return;
  }

  for (const issue of validation.issues) {
    let path: (string | number)[];

    switch (issue.target.kind) {
      case 'schedule':
        path =
          branch === 'onePayment'
            ? ['onePayment', 'root']
            : ['installmentPlan', 'manual', 'scheduleItems', 'root'];
        break;
      case 'scheduleItemAmount':
        path =
          branch === 'manual'
            ? ['installmentPlan', 'manual', 'scheduleItems', issue.target.index, 'amount']
            : ['totalAmount'];
        break;
      case 'scheduleItemDueDate':
        path =
          branch === 'manual'
            ? ['installmentPlan', 'manual', 'scheduleItems', issue.target.index, 'dueDate']
            : ['onePayment', 'dueDate'];
        break;
      default:
        return throwUnhandledDebtPlanTarget(issue.target);
    }

    context.addIssue({
      code: 'custom',
      path,
      message: issue.code,
    });
  }
}

function throwUnhandledDebtPlanTarget(target: never): never {
  throw new Error(`Unhandled debt plan target: ${String(target)}`);
}
