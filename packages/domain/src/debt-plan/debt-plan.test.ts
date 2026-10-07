import { describe, expect, it } from 'vitest';

import {
  allocateInstallmentAmounts,
  debtPlanIssueCode,
  getMaximumInstallmentCount,
  getInstallmentDueDateRange,
  generateInstallmentSchedule,
  summarizeDebtPlanAmounts,
  type DebtPlan,
  type DebtPlanIssue,
  validateDebtPlan,
} from './index.js';

describe('generateInstallmentSchedule', () => {
  it('anchors monthly dates to the original day across a short month', () => {
    expect(
      generateInstallmentSchedule({
        totalAmount: '100.01',
        installmentCount: 3,
        frequency: 'monthly',
        firstDueDate: '2026-01-31',
      }),
    ).toEqual([
      { amount: '33.33', dueDate: '2026-01-31' },
      { amount: '33.33', dueDate: '2026-02-28' },
      { amount: '33.35', dueDate: '2026-03-31' },
    ]);
  });

  it('adds seven calendar days for weekly schedules across a year boundary', () => {
    expect(
      generateInstallmentSchedule({
        totalAmount: '30.00',
        installmentCount: 3,
        frequency: 'weekly',
        firstDueDate: '2026-12-29',
      }).map(({ dueDate }) => dueDate),
    ).toEqual(['2026-12-29', '2027-01-05', '2027-01-12']);
  });

  it('adds seven calendar days across a leap-day boundary', () => {
    expect(
      generateInstallmentSchedule({
        totalAmount: '20.00',
        installmentCount: 2,
        frequency: 'weekly',
        firstDueDate: '2028-02-26',
      }).map(({ dueDate }) => dueDate),
    ).toEqual(['2028-02-26', '2028-03-04']);
  });

  it('preserves the monthly anchor across a year boundary and short February', () => {
    expect(
      generateInstallmentSchedule({
        totalAmount: '30.00',
        installmentCount: 4,
        frequency: 'monthly',
        firstDueDate: '2028-11-30',
      }).map(({ dueDate }) => dueDate),
    ).toEqual(['2028-11-30', '2028-12-30', '2029-01-30', '2029-02-28']);
  });

  it('restores a December month-end anchor after February clamping', () => {
    expect(
      generateInstallmentSchedule({
        totalAmount: '40.00',
        installmentCount: 4,
        frequency: 'monthly',
        firstDueDate: '2028-12-31',
      }).map(({ dueDate }) => dueDate),
    ).toEqual(['2028-12-31', '2029-01-31', '2029-02-28', '2029-03-31']);
  });

  it('uses February 29 when the anchored month has a leap day', () => {
    expect(
      generateInstallmentSchedule({
        totalAmount: '30.00',
        installmentCount: 3,
        frequency: 'monthly',
        firstDueDate: '2028-01-31',
      }).map(({ dueDate }) => dueDate),
    ).toEqual(['2028-01-31', '2028-02-29', '2028-03-31']);
  });

  it('preserves a February 29 anchor when the next year is not a leap year', () => {
    const schedule = generateInstallmentSchedule({
      totalAmount: '13.00',
      installmentCount: 13,
      frequency: 'monthly',
      firstDueDate: '2028-02-29',
    });

    expect(schedule[0]?.dueDate).toBe('2028-02-29');
    expect(schedule[1]?.dueDate).toBe('2028-03-29');
    expect(schedule[12]?.dueDate).toBe('2029-02-28');
  });

  it.each(['2026-02-29', '2026-2-3', '2026-02-03-extra'])(
    'rejects an invalid first due date: %s',
    (firstDueDate) => {
      expect(() =>
        generateInstallmentSchedule({
          totalAmount: '30.00',
          installmentCount: 2,
          frequency: 'monthly',
          firstDueDate,
        }),
      ).toThrow('First due date must be a valid calendar date');
    },
  );

  it('keeps generated dates in four-digit year format', () => {
    expect(
      generateInstallmentSchedule({
        totalAmount: '2.00',
        installmentCount: 2,
        frequency: 'monthly',
        firstDueDate: '0004-02-29',
      }).map(({ dueDate }) => dueDate),
    ).toEqual(['0004-02-29', '0004-03-29']);
  });

  it.each(['1.999', '1.2.3'])('rejects a malformed amount: %s', (totalAmount) => {
    expect(() =>
      generateInstallmentSchedule({
        totalAmount,
        installmentCount: 1,
        frequency: 'monthly',
        firstDueDate: '2026-01-01',
      }),
    ).toThrow('Amount must contain only digits and at most two decimal places');
  });
});

describe('getMaximumInstallmentCount', () => {
  it.each([
    ['100.00', 60],
    ['0.02', 2],
    ['0.01', 1],
  ])('limits %s to %s positive installments', (totalAmount, expected) => {
    expect(getMaximumInstallmentCount(totalAmount)).toBe(expected);
  });
});

describe('allocateInstallmentAmounts', () => {
  it('allocates the remainder to the final installment in minor units', () => {
    expect(allocateInstallmentAmounts('100.01', 3)).toEqual(['33.33', '33.33', '33.35']);
  });

  it('treats a whole-unit amount as two decimal minor units', () => {
    expect(allocateInstallmentAmounts('128', 3)).toEqual(['42.66', '42.66', '42.68']);
  });

  it('rejects more installments than the total can support positively', () => {
    expect(() => allocateInstallmentAmounts('0.02', 3)).toThrow(
      'Installment count exceeds the maximum for this total',
    );
  });

  it.each([0, -1, 2.5])('rejects an invalid installment count: %s', (installmentCount) => {
    expect(() => allocateInstallmentAmounts('100.00', installmentCount)).toThrow(
      'Installment count must be a positive integer',
    );
  });

  it.each([
    ['0.01', 1, ['0.01']],
    ['0.02', 2, ['0.01', '0.01']],
  ])(
    'allocates the smallest valid total %s across %s installment(s)',
    (totalAmount, installmentCount, expected) => {
      expect(allocateInstallmentAmounts(totalAmount, installmentCount)).toEqual(expected);
    },
  );
});

describe('summarizeDebtPlanAmounts', () => {
  it('reports the exact remaining amount in minor units', () => {
    expect(
      summarizeDebtPlanAmounts({
        totalAmount: '100.00',
        scheduleAmounts: ['25.10', '64.90'],
      }),
    ).toEqual({
      debtTotal: '100.00',
      scheduleTotal: '90.00',
      difference: { kind: 'remaining', amount: '10.00' },
    });
  });

  it('reports a balanced schedule as zero remaining', () => {
    expect(
      summarizeDebtPlanAmounts({
        totalAmount: '100.00',
        scheduleAmounts: ['25.10', '74.90'],
      }),
    ).toEqual({
      debtTotal: '100.00',
      scheduleTotal: '100.00',
      difference: { kind: 'remaining', amount: '0.00' },
    });
  });

  it('reports the exact excess amount in minor units', () => {
    expect(
      summarizeDebtPlanAmounts({
        totalAmount: '100.00',
        scheduleAmounts: ['60.01', '40.02'],
      }),
    ).toEqual({
      debtTotal: '100.00',
      scheduleTotal: '100.03',
      difference: { kind: 'excess', amount: '0.03' },
    });
  });
});

describe('getInstallmentDueDateRange', () => {
  it('returns date-only bounds across month, year, and leap-day boundaries', () => {
    expect(
      getInstallmentDueDateRange({
        previousDueDate: '2028-02-28',
        nextDueDate: '2028-03-01',
      }),
    ).toEqual({
      earliestDueDate: '2028-02-29',
      latestDueDate: '2028-02-29',
    });

    expect(
      getInstallmentDueDateRange({
        previousDueDate: '2026-12-31',
        nextDueDate: '2027-01-02',
      }),
    ).toEqual({
      earliestDueDate: '2027-01-01',
      latestDueDate: '2027-01-01',
    });
  });

  it('computes only the bound whose adjacent date is present', () => {
    expect(getInstallmentDueDateRange({ previousDueDate: '2026-05-01' })).toEqual({
      earliestDueDate: '2026-05-02',
    });
    expect(getInstallmentDueDateRange({ nextDueDate: '2026-05-01' })).toEqual({
      latestDueDate: '2026-04-30',
    });
  });
});

describe('validateDebtPlan', () => {
  it('accepts a canonical one-payment plan', () => {
    expect(
      validateDebtPlan({
        totalAmount: '125.50',
        scheduleItems: [
          {
            amount: '125.50',
            dueDate: '2026-09-30',
          },
        ],
      }),
    ).toEqual({ success: true });
  });

  it('accepts a canonical two-row installment plan with an exact minor-unit sum', () => {
    expect(
      validateDebtPlan({
        totalAmount: '125.50',
        scheduleItems: [
          { amount: '0.30', dueDate: '2026-09-30' },
          { amount: '125.20', dueDate: '2026-10-30' },
        ],
      }),
    ).toEqual({ success: true });
  });

  it('accepts the maximum 60-row installment plan', () => {
    expect(
      validateDebtPlan({
        totalAmount: '60.00',
        scheduleItems: scheduleItemsFor(60),
      }),
    ).toEqual({ success: true });
  });

  it('rejects an installment plan with more than 60 rows', () => {
    const issues = issuesFor({
      totalAmount: '61.00',
      scheduleItems: scheduleItemsFor(61),
    });

    expect(issues).toContainEqual({
      code: debtPlanIssueCode.scheduleItemCountInvalid,
      target: { kind: 'schedule' },
    });
  });

  it('reports count, amount, and ordering issues together for an oversized multi-row plan', () => {
    const scheduleItems = scheduleItemsFor(61).map((scheduleItem, index) =>
      index === 1
        ? { amount: '2.00', dueDate: '2026-01-01' }
        : scheduleItem,
    );

    const issues = issuesFor({
      totalAmount: '61.00',
      scheduleItems,
    });

    expect(issues.map(({ code }) => code)).toEqual([
      debtPlanIssueCode.scheduleItemCountInvalid,
      debtPlanIssueCode.scheduleItemDueDateNotAfterPrevious,
      debtPlanIssueCode.scheduleTotalAmountMismatch,
    ]);
  });

  it('rejects a multi-row plan whose aggregate amount differs from the total', () => {
    const issues = issuesFor({
      totalAmount: '125.50',
      scheduleItems: [
        { amount: '0.30', dueDate: '2026-09-30' },
        { amount: '125.19', dueDate: '2026-10-30' },
      ],
    });

    expect(issues).toContainEqual({
      code: debtPlanIssueCode.scheduleTotalAmountMismatch,
      target: { kind: 'schedule' },
    });
  });

  it('rejects installment rows with duplicate due dates', () => {
    const issues = issuesFor({
      totalAmount: '125.50',
      scheduleItems: [
        { amount: '0.30', dueDate: '2026-09-30' },
        { amount: '125.20', dueDate: '2026-09-30' },
      ],
    });

    expect(issues).toContainEqual({
      code: debtPlanIssueCode.scheduleItemDueDateNotAfterPrevious,
      target: { kind: 'scheduleItemDueDate', index: 1 },
    });
  });

  it('rejects installment rows with decreasing due dates', () => {
    const issues = issuesFor({
      totalAmount: '125.50',
      scheduleItems: [
        { amount: '0.30', dueDate: '2026-10-30' },
        { amount: '125.20', dueDate: '2026-09-30' },
      ],
    });

    expect(issues).toContainEqual({
      code: debtPlanIssueCode.scheduleItemDueDateNotAfterPrevious,
      target: { kind: 'scheduleItemDueDate', index: 1 },
    });
  });

  it('requires exactly one schedule item', () => {
    const issues = issuesFor({
      totalAmount: '125.50',
      scheduleItems: [],
    });

    expect(issues).toContainEqual({
      code: debtPlanIssueCode.scheduleItemCountInvalid,
      target: { kind: 'schedule' },
    });
  });

  it.each([
    ['under-total', '0.10'],
    ['over-total', '0.50'],
  ])('rejects a schedule amount that is %s without floating-point arithmetic', (_label, amount) => {
    const issues = issuesFor({
      totalAmount: '0.30',
      scheduleItems: [{ amount, dueDate: '2026-09-30' }],
    });

    expect(issues).toContainEqual({
      code: debtPlanIssueCode.scheduleItemAmountDoesNotMatchTotal,
      target: { kind: 'scheduleItemAmount', index: 0 },
    });
  });

  it('rejects a non-positive schedule amount', () => {
    const issues = issuesFor({
      totalAmount: '0.00',
      scheduleItems: [{ amount: '0.00', dueDate: '2026-09-30' }],
    });

    expect(issues).toContainEqual({
      code: debtPlanIssueCode.scheduleItemAmountNotPositive,
      target: { kind: 'scheduleItemAmount', index: 0 },
    });
  });

  it('rejects dates that are not valid calendar dates', () => {
    const issues = issuesFor({
      totalAmount: '125.50',
      scheduleItems: [{ amount: '125.50', dueDate: '2026-02-29' }],
    });

    expect(issues).toContainEqual({
      code: debtPlanIssueCode.scheduleItemDueDateInvalid,
      target: { kind: 'scheduleItemDueDate', index: 0 },
    });
  });

  it('returns independent issues together', () => {
    const issues = issuesFor({
      totalAmount: '1.00',
      scheduleItems: [
        { amount: '0.00', dueDate: '2026-02-30' },
        { amount: '2.00', dueDate: 'not-a-date' },
      ],
    });

    expect(issues.map(({ code }) => code)).toEqual([
      debtPlanIssueCode.scheduleItemAmountNotPositive,
      debtPlanIssueCode.scheduleItemDueDateInvalid,
      debtPlanIssueCode.scheduleItemDueDateInvalid,
      debtPlanIssueCode.scheduleTotalAmountMismatch,
    ]);
  });
});

function issuesFor(plan: DebtPlan): readonly DebtPlanIssue[] {
  const result = validateDebtPlan(plan);

  expect(result.success).toBe(false);

  if (result.success) {
    throw new Error('Expected debt plan validation to fail');
  }

  return result.issues;
}

function scheduleItemsFor(count: number): DebtPlan['scheduleItems'] {
  return Array.from({ length: count }, (_, index) => ({
    amount: '1.00',
    dueDate: new Date(Date.UTC(2026, 0, index + 1)).toISOString().slice(0, 10),
  }));
}
