import { get, set, type FieldErrors, type Resolver } from 'react-hook-form';

import {
  createDebtRequestSchema,
  debtPlanIssueCode,
  type CreateDebtRequest,
  type Currency,
  type DebtResponse,
} from '@collectify/contracts';
import {
  generateInstallmentSchedule,
  getMaximumInstallmentCount,
  type InstallmentFrequency,
} from '@collectify/domain/debt-plan';

export type { InstallmentFrequency };

export type PaymentPlan = 'onePayment' | 'installment';

export type DebtDraft = {
  description: string;
  totalAmount: string;
  currency: Currency;
  paymentPlan: PaymentPlan;
  onePayment: {
    dueDate: string;
  };
  installmentPlan: {
    installmentCount: string;
    frequency: InstallmentFrequency;
    firstDueDate: string;
  };
};

type DraftField =
  | keyof Pick<DebtDraft, 'description' | 'totalAmount' | 'currency'>
  | 'onePayment.dueDate'
  | 'installmentPlan.installmentCount'
  | 'installmentPlan.frequency'
  | 'installmentPlan.firstDueDate'
  | 'root';

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
      installmentCount: '2',
      frequency: 'monthly',
      firstDueDate: '',
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

function resolveOnePayment(draft: DebtDraft) {
  const firstScheduleRequestResult = parseFirstScheduleRequest(draft, draft.onePayment.dueDate);

  if (firstScheduleRequestResult.success) {
    return { values: firstScheduleRequestResult.data, errors: {} };
  }

  const errors: FieldErrors<DebtDraft> = {};
  addRequestErrors(errors, firstScheduleRequestResult.error.issues, draft.paymentPlan);

  return { values: {}, errors };
}

function resolveInstallments(draft: DebtDraft) {
  const firstScheduleRequestResult = parseFirstScheduleRequest(
    draft,
    draft.installmentPlan.firstDueDate,
  );
  const errors: FieldErrors<DebtDraft> = {};

  if (!firstScheduleRequestResult.success) {
    addRequestErrors(errors, firstScheduleRequestResult.error.issues, draft.paymentPlan);
  }

  const installmentCount = parseInstallmentCount(draft.installmentPlan.installmentCount);

  if (installmentCount === undefined) {
    setFirstError(
      errors,
      'installmentPlan.installmentCount',
      debtPlanIssueCode.scheduleItemCountInvalid,
    );
  }

  if (!isInstallmentFrequency(draft.installmentPlan.frequency)) {
    setFirstError(errors, 'installmentPlan.frequency', debtPlanIssueCode.scheduleItemCountInvalid);

    return { values: {}, errors };
  }

  if (!firstScheduleRequestResult.success || installmentCount === undefined) {
    return { values: {}, errors };
  }

  const maximumInstallmentCount = getMaximumInstallmentCount(
    firstScheduleRequestResult.data.totalAmount,
  );

  if (installmentCount > maximumInstallmentCount) {
    setFirstError(
      errors,
      'installmentPlan.installmentCount',
      debtPlanIssueCode.scheduleItemCountInvalid,
    );

    return { values: {}, errors };
  }

  let scheduleItems: readonly {
    amount: string;
    dueDate: string;
  }[];

  try {
    scheduleItems = generateInstallmentSchedule({
      totalAmount: firstScheduleRequestResult.data.totalAmount,
      installmentCount,
      frequency: draft.installmentPlan.frequency,
      firstDueDate: firstScheduleRequestResult.data.scheduleItems[0].dueDate,
    });
  } catch {
    setFirstError(errors, 'root', debtPlanIssueCode.scheduleItemDueDateInvalid);

    return { values: {}, errors };
  }

  const result = createDebtRequestSchema.safeParse({
    ...firstScheduleRequestResult.data,
    scheduleItems: [...scheduleItems],
  });

  if (result.success) {
    return { values: result.data, errors: {} };
  }

  addRequestErrors(errors, result.error.issues, draft.paymentPlan);
  return { values: {}, errors };
}

function parseFirstScheduleRequest(draft: DebtDraft, firstDueDate: string) {
  return createDebtRequestSchema.safeParse({
    description: draft.description,
    totalAmount: draft.totalAmount,
    currency: draft.currency,
    scheduleItems: [
      {
        amount: draft.totalAmount,
        dueDate: firstDueDate,
      },
    ],
  });
}

function parseInstallmentCount(value: string): number | undefined {
  if (!/^\d+$/.test(value)) {
    return undefined;
  }

  const count = Number(value);

  return Number.isSafeInteger(count) && count >= 2 ? count : undefined;
}

function isInstallmentFrequency(value: string): value is InstallmentFrequency {
  return value === 'weekly' || value === 'monthly';
}

function addRequestErrors(
  errors: FieldErrors<DebtDraft>,
  issues: readonly { path: readonly PropertyKey[]; message: string }[],
  paymentPlan: PaymentPlan,
) {
  for (const issue of issues) {
    setFirstError(errors, draftFieldFromRequestIssue(issue.path, paymentPlan), issue.message);
  }
}

function draftFieldFromRequestIssue(
  [field, , nestedField]: readonly PropertyKey[],
  paymentPlan: PaymentPlan,
): DraftField {
  if (field === 'description' || field === 'totalAmount' || field === 'currency') {
    return field;
  }

  if (field === 'scheduleItems') {
    if (nestedField === 'amount') {
      return 'totalAmount';
    }

    if (nestedField === 'dueDate') {
      return paymentPlan === 'onePayment' ? 'onePayment.dueDate' : 'installmentPlan.firstDueDate';
    }
  }

  return 'root';
}

function setFirstError(errors: FieldErrors<DebtDraft>, field: DraftField, message: string) {
  if (!get(errors, field)) {
    set(errors, field, {
      message,
      type: 'validate',
    });
  }
}
