import { describe, expect, it } from 'vitest';

import {
  debtPlanIssueCode,
  type DebtPlan,
  type DebtPlanIssue,
  validateDebtPlan,
} from './index.js';

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
  ])(
    'rejects a schedule amount that is %s without floating-point arithmetic',
    (_label, amount) => {
      const issues = issuesFor({
        totalAmount: '0.30',
        scheduleItems: [{ amount, dueDate: '2026-09-30' }],
      });

      expect(issues).toContainEqual({
        code: debtPlanIssueCode.scheduleItemAmountDoesNotMatchTotal,
        target: { kind: 'scheduleItemAmount', index: 0 },
      });
    },
  );

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
    dueDate: new Date(Date.UTC(2026, 0, index + 1))
      .toISOString()
      .slice(0, 10),
  }));
}
