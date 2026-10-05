export type DebtPlan = {
  readonly totalAmount: string;
  readonly scheduleItems: readonly {
    readonly amount: string;
    readonly dueDate: string;
  }[];
};

export type InstallmentFrequency = 'weekly' | 'monthly';

export type InstallmentScheduleOptions = {
  readonly totalAmount: string;
  readonly installmentCount: number;
  readonly frequency: InstallmentFrequency;
  readonly firstDueDate: string;
};

const maximumInstallmentCount = 60;

export function getMaximumInstallmentCount(totalAmount: string): number {
  const totalMinorUnits = parseMinorUnits(totalAmount);

  return totalMinorUnits < BigInt(maximumInstallmentCount)
    ? Number(totalMinorUnits)
    : maximumInstallmentCount;
}

export function allocateInstallmentAmounts(
  totalAmount: string,
  installmentCount: number,
): readonly string[] {
  if (!Number.isInteger(installmentCount) || installmentCount < 1) {
    throw new Error('Installment count must be a positive integer');
  }

  if (installmentCount > getMaximumInstallmentCount(totalAmount)) {
    throw new Error('Installment count exceeds the maximum for this total');
  }

  const totalMinorUnits = parseMinorUnits(totalAmount);
  const installmentMinorUnits = totalMinorUnits / BigInt(installmentCount);
  const remainderMinorUnits = totalMinorUnits % BigInt(installmentCount);

  return Array.from({ length: installmentCount }, (_, index) => {
    const amount =
      index === installmentCount - 1
        ? installmentMinorUnits + remainderMinorUnits
        : installmentMinorUnits;

    return formatMinorUnits(amount);
  });
}

export function generateInstallmentSchedule(
  options: InstallmentScheduleOptions,
): DebtPlan['scheduleItems'] {
  if (!isValidDateOnly(options.firstDueDate)) {
    throw new Error('First due date must be a valid calendar date');
  }

  const amounts = allocateInstallmentAmounts(options.totalAmount, options.installmentCount);

  return amounts.map((amount, index) => ({
    amount,
    dueDate: installmentDueDate(options.firstDueDate, index, options.frequency),
  }));
}

export const debtPlanIssueCode = {
  scheduleItemCountInvalid: 'SCHEDULE_ITEM_COUNT_INVALID',
  scheduleItemAmountNotPositive: 'SCHEDULE_ITEM_AMOUNT_NOT_POSITIVE',
  scheduleItemAmountDoesNotMatchTotal: 'SCHEDULE_ITEM_AMOUNT_DOES_NOT_MATCH_TOTAL',
  scheduleTotalAmountMismatch: 'SCHEDULE_TOTAL_AMOUNT_MISMATCH',
  scheduleItemDueDateInvalid: 'SCHEDULE_ITEM_DUE_DATE_INVALID',
  scheduleItemDueDateNotAfterPrevious: 'SCHEDULE_ITEM_DUE_DATE_NOT_AFTER_PREVIOUS',
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
  const totalMinorUnits = parseMinorUnits(plan.totalAmount);
  const maximumInstallmentCount = getMaximumInstallmentCount(plan.totalAmount);
  const isOnePayment = scheduleItemCount === 1;
  const isInstallment = scheduleItemCount >= 2 && scheduleItemCount <= maximumInstallmentCount;

  if (!isOnePayment && !isInstallment) {
    issues.push({
      code: debtPlanIssueCode.scheduleItemCountInvalid,
      target: { kind: 'schedule' },
    });
  }

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
  if (!/^\d+(?:\.\d{0,2})?$/.test(amount)) {
    throw new Error('Amount must contain only digits and at most two decimal places');
  }

  const [wholeAmount, fractionalAmount = ''] = amount.split('.');
  return BigInt(`${wholeAmount}${fractionalAmount.padEnd(2, '0')}`);
}

function formatMinorUnits(amount: bigint): string {
  const wholeAmount = amount / 100n;
  const fractionalAmount = (amount % 100n).toString().padStart(2, '0');

  return `${wholeAmount}.${fractionalAmount}`;
}

function installmentDueDate(
  firstDueDate: string,
  index: number,
  frequency: InstallmentFrequency,
): string {
  if (frequency === 'weekly') {
    return addDays(firstDueDate, index * 7);
  }

  if (frequency === 'monthly') {
    return addMonthsKeepingAnchor(firstDueDate, index);
  }

  throw new Error('Unsupported installment frequency');
}

function isValidDateOnly(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

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

function addDays(value: string, dayCount: number): string {
  let { year, month, day } = dateOnlyParts(value);

  for (let index = 0; index < dayCount; index += 1) {
    day += 1;

    if (day > daysInMonth(year, month)) {
      day = 1;
      month += 1;

      if (month > 12) {
        month = 1;
        year += 1;
      }
    }
  }

  return formatDateOnly(year, month, day);
}

function addMonthsKeepingAnchor(value: string, monthCount: number): string {
  const { year: firstYear, month: firstMonth, day: firstDay } = dateOnlyParts(value);
  const absoluteMonth = firstYear * 12 + firstMonth - 1 + monthCount;
  const year = Math.floor(absoluteMonth / 12);
  const month = (absoluteMonth % 12) + 1;
  const day = Math.min(firstDay, daysInMonth(year, month));

  return formatDateOnly(year, month, day);
}

function dateOnlyParts(value: string): {
  year: number;
  month: number;
  day: number;
} {
  const [year, month, day] = value.split('-').map(Number);

  return { year, month, day };
}

function formatDateOnly(year: number, month: number, day: number): string {
  return [
    year.toString().padStart(4, '0'),
    month.toString().padStart(2, '0'),
    day.toString().padStart(2, '0'),
  ].join('-');
}

function compareDateOnly(left: string, right: string): number {
  const [leftYear, leftMonth, leftDay] = left.split('-').map(Number);
  const [rightYear, rightMonth, rightDay] = right.split('-').map(Number);

  return leftYear - rightYear || leftMonth - rightMonth || leftDay - rightDay;
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
