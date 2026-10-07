import { get, set, type FieldErrors, type Resolver } from 'react-hook-form';
import { z } from 'zod';

import {
  createDebtRequestSchema,
  currencySchema,
  debtPlanIssueCode,
  debtRequestValidationCode,
  type CreateDebtRequest,
  type Currency,
  type DebtResponse,
} from '@collectify/contracts';
import {
  summarizeDebtPlanAmounts,
  validateDebtPlan,
  type DebtPlanAmountSummary,
  type DebtPlanIssue,
  type InstallmentFrequency,
} from '@collectify/domain/debt-plan';

import {
  buildInstallmentScheduleFromDraft,
  type ManualScheduleItemDraft,
  type InstallmentPlanDraft,
  type InstallmentScheduleResult,
} from './installment-schedule-draft';

export type { InstallmentFrequency };
export type { InstallmentPlanDraft } from './installment-schedule-draft';

export type PaymentPlan = 'onePayment' | 'installment';

export type DebtDraft = {
  description: string;
  totalAmount: string;
  currency: Currency;
  paymentPlan: PaymentPlan;
  onePayment: {
    dueDate: string;
  };
  installmentPlan: InstallmentPlanDraft;
};

export type ManualInstallmentSummary =
  | { readonly status: 'ready'; readonly summary: DebtPlanAmountSummary }
  | { readonly status: 'invalid' };

type DraftField =
  | keyof Pick<DebtDraft, 'description' | 'totalAmount' | 'currency'>
  | 'onePayment.dueDate'
  | 'installmentPlan.automatic.installmentCount'
  | 'installmentPlan.automatic.firstDueDate'
  | 'root';

type DraftErrorField =
  | DraftField
  | `installmentPlan.manual.scheduleItems.${number}.${'amount' | 'dueDate'}`;

const amountPattern = /^\d+(?:\.\d{1,2})?$/;

function createDraftAmountSchema(invalidMessage: string) {
  return z
    .string()
    .trim()
    .regex(amountPattern, invalidMessage)
    .refine(isWithinNumeric182Precision, debtRequestValidationCode.debtTotalAmountTooLarge)
    .transform(normalizeParsedAmount);
}

const commonDebtDraftSchema = z.object({
  description: z
    .string()
    .trim()
    .min(1, debtRequestValidationCode.debtDescriptionRequired)
    .max(200, debtRequestValidationCode.debtDescriptionTooLong),
  totalAmount: createDraftAmountSchema(debtRequestValidationCode.debtTotalAmountInvalid),
  currency: currencySchema,
});

const manualInstallmentPlanSchema = z.object({
  totalAmount: createDraftAmountSchema(debtRequestValidationCode.debtTotalAmountInvalid),
  scheduleItems: z.array(
    z.object({
      amount: createDraftAmountSchema(
        debtRequestValidationCode.debtScheduleItemAmountInvalid,
      ),
      dueDate: z
        .string()
        .min(1, debtRequestValidationCode.debtDueDateRequired)
        .regex(/^\d{4}-\d{2}-\d{2}$/, debtRequestValidationCode.debtDueDateInvalid),
    }),
  ),
});

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
        firstDueDate: '',
      },
      manual: {
        scheduleItems: [],
      },
    },
  };
}

export const debtDraftResolver: Resolver<DebtDraft, unknown, CreateDebtRequest> = (draft) => {
  switch (draft.paymentPlan) {
    case 'onePayment':
      return resolveOnePayment(draft);
    case 'installment':
      return resolveInstallments(draft);
  }
};

export function buildManualInstallmentSummary(input: {
  readonly totalAmount: string;
  readonly scheduleItems: readonly ManualScheduleItemDraft[];
}): ManualInstallmentSummary {
  const totalAmount = normalizeAmountForSummary(input.totalAmount);
  const scheduleAmounts = input.scheduleItems.map(({ amount }) => normalizeAmountForSummary(amount));

  if (
    totalAmount === undefined ||
    scheduleAmounts.length === 0 ||
    scheduleAmounts.some((amount) => amount === undefined)
  ) {
    return { status: 'invalid' };
  }

  return {
    status: 'ready',
    summary: summarizeDebtPlanAmounts({
      scheduleAmounts: scheduleAmounts.filter(isDefined),
      totalAmount,
    }),
  };
}

function resolveOnePayment(draft: DebtDraft) {
  const requestResult = parseDraftPlanBase(draft, draft.onePayment.dueDate);

  if (requestResult.success) {
    return { values: requestResult.data, errors: {} };
  }

  const errors: FieldErrors<DebtDraft> = {};
  addRequestErrors(errors, requestResult.error.issues, draft.paymentPlan);

  return { values: {}, errors };
}

function resolveInstallments(draft: DebtDraft) {
  if (draft.installmentPlan.mode === 'manual') {
    return resolveManualInstallments(draft);
  }

  return resolveAutomaticInstallments(draft);
}

function resolveAutomaticInstallments(draft: DebtDraft) {
  const baseRequestResult = parseDraftPlanBase(
    draft,
    draft.installmentPlan.automatic.firstDueDate,
  );
  const errors: FieldErrors<DebtDraft> = {};

  if (!baseRequestResult.success) {
    addRequestErrors(errors, baseRequestResult.error.issues, draft.paymentPlan);
  }

  const scheduleResult = buildInstallmentScheduleFromDraft({
    totalAmount: baseRequestResult.success
      ? baseRequestResult.data.totalAmount
      : draft.totalAmount,
    installmentPlan: draft.installmentPlan.automatic,
  });

  addScheduleBuildErrors(errors, scheduleResult);

  if (!baseRequestResult.success || scheduleResult.status !== 'ready') {
    return { values: {}, errors };
  }

  const result = createDebtRequestSchema.safeParse({
    ...baseRequestResult.data,
    scheduleItems: [...scheduleResult.scheduleItems],
  });

  if (result.success) {
    return { values: result.data, errors: {} };
  }

  addRequestErrors(errors, result.error.issues, draft.paymentPlan, 'automatic');
  return { values: {}, errors };
}

function resolveManualInstallments(draft: DebtDraft) {
  const commonResult = commonDebtDraftSchema.safeParse(draft);
  const planResult = manualInstallmentPlanSchema.safeParse({
    totalAmount: draft.totalAmount,
    scheduleItems: draft.installmentPlan.manual.scheduleItems.map(
      ({ amount, dueDate }) => ({ amount, dueDate }),
    ),
  });
  const errors: FieldErrors<DebtDraft> = {};

  if (!commonResult.success) {
    addRequestErrors(errors, commonResult.error.issues, draft.paymentPlan, 'manual');
  }

  if (!planResult.success) {
    addRequestErrors(errors, planResult.error.issues, draft.paymentPlan, 'manual');
    return { values: {}, errors };
  }

  const validation = validateDebtPlan(planResult.data);

  if (!validation.success) {
    addManualPlanErrors(errors, validation.issues);
  }

  if (!commonResult.success || !validation.success) {
    return { values: {}, errors };
  }

  return {
    values: {
      ...commonResult.data,
      scheduleItems: planResult.data.scheduleItems,
    },
    errors: {},
  };
}

function addManualPlanErrors(
  errors: FieldErrors<DebtDraft>,
  issues: readonly DebtPlanIssue[],
) {
  for (const issue of issues) {
    switch (issue.target.kind) {
      case 'schedule':
        addManualScheduleError(errors, issue.code);
        break;
      case 'scheduleItemAmount':
        setFirstError(
          errors,
          `installmentPlan.manual.scheduleItems.${issue.target.index}.amount`,
          issue.code,
        );
        break;
      case 'scheduleItemDueDate':
        setFirstError(
          errors,
          `installmentPlan.manual.scheduleItems.${issue.target.index}.dueDate`,
          issue.code,
        );
        break;
    }
  }
}

function addManualScheduleError(
  errors: FieldErrors<DebtDraft>,
  message: string,
) {
  const field = 'installmentPlan.manual.scheduleItems.root';
  const existingError = get(errors, field) as
    | { message?: string; types?: Record<string, string> }
    | undefined;

  set(errors, field, {
    message: existingError?.message ?? message,
    type: 'validate',
    types: {
      ...existingError?.types,
      [message]: message,
    },
  });
}

function addScheduleBuildErrors(errors: FieldErrors<DebtDraft>, result: InstallmentScheduleResult) {
  if (result.status === 'ready') {
    return;
  }

  for (const issue of result.issues) {
    switch (issue.field) {
      case 'installmentCount':
        setFirstError(
          errors,
          'installmentPlan.automatic.installmentCount',
          debtPlanIssueCode.scheduleItemCountInvalid,
        );
        break;
      case 'firstDueDate':
        setFirstError(
          errors,
          'installmentPlan.automatic.firstDueDate',
          debtPlanIssueCode.scheduleItemDueDateInvalid,
        );
        break;
      case 'totalAmount':
        // The base request schema already maps this error to the total amount field.
        break;
    }
  }
}

function parseDraftPlanBase(draft: DebtDraft, dueDate: string) {
  return createDebtRequestSchema.safeParse({
    description: draft.description,
    totalAmount: draft.totalAmount,
    currency: draft.currency,
    scheduleItems: [
      {
        amount: draft.totalAmount,
        dueDate,
      },
    ],
  });
}

function addRequestErrors(
  errors: FieldErrors<DebtDraft>,
  issues: readonly { path: readonly PropertyKey[]; message: string }[],
  paymentPlan: PaymentPlan,
  installmentMode: 'automatic' | 'manual' = 'automatic',
) {
  for (const issue of issues) {
    setFirstError(
      errors,
      draftFieldFromRequestIssue(issue.path, paymentPlan, installmentMode),
      issue.message,
    );
  }
}

function draftFieldFromRequestIssue(
  [field, index, nestedField]: readonly PropertyKey[],
  paymentPlan: PaymentPlan,
  installmentMode: 'automatic' | 'manual',
): DraftField | `installmentPlan.manual.scheduleItems.${number}.${'amount' | 'dueDate'}` {
  if (field === 'description' || field === 'totalAmount' || field === 'currency') {
    return field;
  }

  if (field === 'scheduleItems') {
    if (nestedField === 'amount') {
      if (paymentPlan === 'installment' && installmentMode === 'manual' && typeof index === 'number') {
        return `installmentPlan.manual.scheduleItems.${index}.amount`;
      }

      return 'totalAmount';
    }

    if (nestedField === 'dueDate') {
      if (paymentPlan === 'installment' && installmentMode === 'manual' && typeof index === 'number') {
        return `installmentPlan.manual.scheduleItems.${index}.dueDate`;
      }

      return paymentPlan === 'onePayment'
        ? 'onePayment.dueDate'
        : 'installmentPlan.automatic.firstDueDate';
    }
  }

  return 'root';
}

function setFirstError(
  errors: FieldErrors<DebtDraft>,
  field: DraftErrorField,
  message: string,
) {
  if (!get(errors, field)) {
    set(errors, field, {
      message,
      type: 'validate',
    });
  }
}

function normalizeAmountForSummary(value: string): string | undefined {
  const trimmedValue = value.trim();

  if (trimmedValue === '') {
    return '0.00';
  }

  if (!/^\d+(?:\.\d{0,2})?$/.test(trimmedValue)) {
    return undefined;
  }

  if (!isWithinNumeric182Precision(trimmedValue)) {
    return undefined;
  }

  return normalizeParsedAmount(trimmedValue);
}

function isWithinNumeric182Precision(amount: string): boolean {
  const [wholeAmount] = amount.split('.');
  const normalizedWholeAmount = wholeAmount.replace(/^0+(?=\d)/, '');

  return normalizedWholeAmount.length <= 16;
}

function normalizeParsedAmount(amount: string): string {
  const [wholeAmount, fractionalAmount = ''] = amount.split('.');
  const normalizedWholeAmount = wholeAmount.replace(/^0+(?=\d)/, '');

  return `${normalizedWholeAmount}.${fractionalAmount.padEnd(2, '0')}`;
}

function isDefined<T>(value: T | undefined): value is T {
  return value !== undefined;
}
