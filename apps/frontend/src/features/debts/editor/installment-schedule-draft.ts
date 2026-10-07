import {
  generateInstallmentSchedule,
  getMaximumInstallmentCount,
  type DebtPlan,
  type InstallmentFrequency,
} from '@collectify/domain/debt-plan';

export type AutomaticInstallmentDraft = {
  installmentCount: string;
  frequency: InstallmentFrequency;
  firstDueDate: string;
};

export type ManualScheduleItemDraft = {
  amount: string;
  dueDate: string;
};

export type InstallmentPlanDraft = {
  mode: 'automatic' | 'manual';
  automatic: AutomaticInstallmentDraft;
  manual: {
    scheduleItems: ManualScheduleItemDraft[];
  };
};

export type InstallmentScheduleDraft = {
  totalAmount: string;
  installmentPlan: AutomaticInstallmentDraft;
};

export type InstallmentScheduleIssue = {
  field: 'totalAmount' | 'installmentCount' | 'firstDueDate';
};

export type InstallmentScheduleResult =
  | {
      status: 'ready';
      maximumInstallmentCount: number;
      scheduleItems: DebtPlan['scheduleItems'];
      issues: readonly [];
    }
  | {
      status: 'invalid';
      maximumInstallmentCount?: number;
      issues: readonly InstallmentScheduleIssue[];
    };

export function buildInstallmentScheduleFromDraft(
  draft: InstallmentScheduleDraft,
): InstallmentScheduleResult {
  const issues: InstallmentScheduleIssue[] = [];
  const installmentCount = parseInstallmentCount(draft.installmentPlan.installmentCount);

  if (installmentCount === undefined) {
    issues.push({ field: 'installmentCount' });
  }

  let maximumInstallmentCount: number;

  try {
    maximumInstallmentCount = getMaximumInstallmentCount(draft.totalAmount);
  } catch {
    return {
      issues: [...issues, { field: 'totalAmount' }],
      status: 'invalid',
    };
  }

  if (installmentCount !== undefined && installmentCount > maximumInstallmentCount) {
    issues.push({ field: 'installmentCount' });
  }

  if (installmentCount === undefined || issues.length > 0) {
    return {
      issues,
      maximumInstallmentCount,
      status: 'invalid',
    };
  }

  try {
    return {
      issues: [],
      maximumInstallmentCount,
      scheduleItems: generateInstallmentSchedule({
        totalAmount: draft.totalAmount,
        installmentCount,
        frequency: draft.installmentPlan.frequency,
        firstDueDate: draft.installmentPlan.firstDueDate,
      }),
      status: 'ready',
    };
  } catch {
    return {
      issues: [{ field: 'firstDueDate' }],
      maximumInstallmentCount,
      status: 'invalid',
    };
  }
}

function parseInstallmentCount(value: string): number | undefined {
  if (!/^\d+$/.test(value)) {
    return undefined;
  }

  const count = Number(value);

  return Number.isSafeInteger(count) && count >= 2 ? count : undefined;
}
