export type DebtPlan = {
  readonly totalAmount: string;
  readonly scheduleItems: readonly {
    readonly amount: string;
    readonly dueDate: string;
  }[];
};
export const debtPlanIssueCode = {
  scheduleItemCountInvalid: 'SCHEDULE_ITEM_COUNT_INVALID',
  totalAmountInvalid: 'TOTAL_AMOUNT_INVALID',
  scheduleItemAmountInvalid: 'SCHEDULE_ITEM_AMOUNT_INVALID',
  scheduleItemAmountNotPositive: 'SCHEDULE_ITEM_AMOUNT_NOT_POSITIVE',
  scheduleItemAmountDoesNotMatchTotal: 'SCHEDULE_ITEM_AMOUNT_DOES_NOT_MATCH_TOTAL',
  scheduleItemDueDateInvalid: 'SCHEDULE_ITEM_DUE_DATE_INVALID',
} as const;

export type DebtPlanIssueCode = (typeof debtPlanIssueCode)[keyof typeof debtPlanIssueCode];

export type DebtPlanIssueTarget =
  | { readonly kind: 'schedule' }
  | { readonly kind: 'totalAmount' }
  | { readonly kind: 'scheduleItemAmount'; readonly index: number }
  | { readonly kind: 'scheduleItemDueDate'; readonly index: number };

export type DebtPlanIssue = {
  readonly code: DebtPlanIssueCode;
  readonly target: DebtPlanIssueTarget;
};

export type DebtPlanValidationResult =
  | { readonly success: true }
  | { readonly success: false; readonly issues: readonly DebtPlanIssue[] };

const fixedScaleDecimalPattern = /^\d+\.\d{2}$/;
const dateOnlyPattern = /^(\d{4})-(\d{2})-(\d{2})$/;
const numeric182MaximumWholeDigits = 16;

export function validateDebtPlan(plan: DebtPlan): DebtPlanValidationResult {
  const issues: DebtPlanIssue[] = [];

  if (plan.scheduleItems.length !== 1) {
    issues.push({
      code: debtPlanIssueCode.scheduleItemCountInvalid,
      target: { kind: 'schedule' },
    });
  }

  const totalMinorUnits = parseMinorUnits(plan.totalAmount);

  if (totalMinorUnits === null) {
    issues.push({
      code: debtPlanIssueCode.totalAmountInvalid,
      target: { kind: 'totalAmount' },
    });
  }

  for (const [index, scheduleItem] of plan.scheduleItems.entries()) {
    const scheduleItemMinorUnits = parseMinorUnits(scheduleItem.amount);

    if (scheduleItemMinorUnits === null) {
      issues.push({
        code: debtPlanIssueCode.scheduleItemAmountInvalid,
        target: { kind: 'scheduleItemAmount', index },
      });
    } else {
      if (scheduleItemMinorUnits === 0n) {
        issues.push({
          code: debtPlanIssueCode.scheduleItemAmountNotPositive,
          target: { kind: 'scheduleItemAmount', index },
        });
      }

      if (totalMinorUnits !== null && scheduleItemMinorUnits !== totalMinorUnits) {
        issues.push({
          code: debtPlanIssueCode.scheduleItemAmountDoesNotMatchTotal,
          target: { kind: 'scheduleItemAmount', index },
        });
      }
    }

    if (!isValidDateOnly(scheduleItem.dueDate)) {
      issues.push({
        code: debtPlanIssueCode.scheduleItemDueDateInvalid,
        target: { kind: 'scheduleItemDueDate', index },
      });
    }
  }

  return issues.length === 0 ? { success: true } : { success: false, issues };
}

function parseMinorUnits(amount: string): bigint | null {
  if (!fixedScaleDecimalPattern.test(amount)) {
    return null;
  }

  const [wholeAmount, fractionalAmount] = amount.split('.');
  const significantWholeAmount = wholeAmount.replace(/^0+(?=\d)/, '');

  if (significantWholeAmount.length > numeric182MaximumWholeDigits) {
    return null;
  }

  return BigInt(`${significantWholeAmount}${fractionalAmount}`);
}

function isValidDateOnly(value: string): boolean {
  const match = dateOnlyPattern.exec(value);

  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (year === 0 || month < 1 || month > 12 || day < 1) {
    return false;
  }

  return day <= daysInMonth(year, month);
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
