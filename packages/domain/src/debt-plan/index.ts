export type DebtPlan = {
  readonly totalAmount: string;
  readonly scheduleItems: readonly {
    readonly amount: string;
    readonly dueDate: string;
  }[];
};
export const debtPlanIssueCode = {
  scheduleItemCountInvalid: 'SCHEDULE_ITEM_COUNT_INVALID',
  scheduleItemAmountNotPositive: 'SCHEDULE_ITEM_AMOUNT_NOT_POSITIVE',
  scheduleItemAmountDoesNotMatchTotal: 'SCHEDULE_ITEM_AMOUNT_DOES_NOT_MATCH_TOTAL',
  scheduleTotalAmountMismatch: 'SCHEDULE_TOTAL_AMOUNT_MISMATCH',
  scheduleItemDueDateInvalid: 'SCHEDULE_ITEM_DUE_DATE_INVALID',
  scheduleItemDueDateNotAfterPrevious:
    'SCHEDULE_ITEM_DUE_DATE_NOT_AFTER_PREVIOUS',
} as const;

export type DebtPlanIssueCode = (typeof debtPlanIssueCode)[keyof typeof debtPlanIssueCode];

export type DebtPlanIssueTarget =
  | { readonly kind: 'schedule' }
  | { readonly kind: 'scheduleItemAmount'; readonly index: number }
  | { readonly kind: 'scheduleItemDueDate'; readonly index: number };

export type DebtPlanIssue = {
  readonly code: DebtPlanIssueCode;
  readonly target: DebtPlanIssueTarget;
};

export type DebtPlanValidationResult =
  | { readonly success: true }
  | { readonly success: false; readonly issues: readonly DebtPlanIssue[] };

export function validateDebtPlan(plan: DebtPlan): DebtPlanValidationResult {
  const issues: DebtPlanIssue[] = [];

  const scheduleItemCount = plan.scheduleItems.length;
  const isOnePayment = scheduleItemCount === 1;
  const isInstallment = scheduleItemCount >= 2 && scheduleItemCount <= 60;

  if (!isOnePayment && !isInstallment) {
    issues.push({
      code: debtPlanIssueCode.scheduleItemCountInvalid,
      target: { kind: 'schedule' },
    });
  }

  const totalMinorUnits = parseMinorUnits(plan.totalAmount);
  let scheduleTotalMinorUnits = 0n;
  let previousValidDueDate: string | undefined;

  for (const [index, scheduleItem] of plan.scheduleItems.entries()) {
    const scheduleItemMinorUnits = parseMinorUnits(scheduleItem.amount);
    scheduleTotalMinorUnits += scheduleItemMinorUnits;

    if (scheduleItemMinorUnits === 0n) {
      issues.push({
        code: debtPlanIssueCode.scheduleItemAmountNotPositive,
        target: { kind: 'scheduleItemAmount', index },
      });
    }

    if (isOnePayment && scheduleItemMinorUnits !== totalMinorUnits) {
      issues.push({
        code: debtPlanIssueCode.scheduleItemAmountDoesNotMatchTotal,
        target: { kind: 'scheduleItemAmount', index },
      });
    }

    const dueDateIsValid = isValidDateOnly(scheduleItem.dueDate);

    if (!dueDateIsValid) {
      issues.push({
        code: debtPlanIssueCode.scheduleItemDueDateInvalid,
        target: { kind: 'scheduleItemDueDate', index },
      });

      continue;
    }

    if (
      isInstallment &&
      previousValidDueDate !== undefined &&
      compareDateOnly(scheduleItem.dueDate, previousValidDueDate) <= 0
    ) {
      issues.push({
        code: debtPlanIssueCode.scheduleItemDueDateNotAfterPrevious,
        target: { kind: 'scheduleItemDueDate', index },
      });
    }

    previousValidDueDate = scheduleItem.dueDate;
  }

  if (isInstallment && scheduleTotalMinorUnits !== totalMinorUnits) {
    issues.push({
      code: debtPlanIssueCode.scheduleTotalAmountMismatch,
      target: { kind: 'schedule' },
    });
  }

  return issues.length === 0 ? { success: true } : { success: false, issues };
}

function parseMinorUnits(amount: string): bigint {
  const [wholeAmount, fractionalAmount] = amount.split('.');
  return BigInt(`${wholeAmount}${fractionalAmount}`);
}

function isValidDateOnly(value: string): boolean {
  const [year, month, day] = value.split('-').map(Number);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    year === 0 ||
    month < 1 ||
    month > 12 ||
    day < 1
  ) {
    return false;
  }

  return day <= daysInMonth(year, month);
}

function compareDateOnly(left: string, right: string): number {
  const [leftYear, leftMonth, leftDay] = left.split('-').map(Number);
  const [rightYear, rightMonth, rightDay] = right.split('-').map(Number);

  return (
    leftYear - rightYear || leftMonth - rightMonth || leftDay - rightDay
  );
}

function daysInMonth(year: number, month: number): number {
  if (month === 2) {
    return isLeapYear(year) ? 29 : 28;
  }

  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}
