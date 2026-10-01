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

  it('rejects amounts that cannot be represented by NUMERIC(18,2)', () => {
    const issues = issuesFor({
      totalAmount: '10000000000000000.00',
      scheduleItems: [
        { amount: '10000000000000000.00', dueDate: '2026-09-30' },
      ],
    });

    expect(issues).toEqual([
      {
        code: debtPlanIssueCode.totalAmountInvalid,
        target: { kind: 'totalAmount' },
      },
      {
        code: debtPlanIssueCode.scheduleItemAmountInvalid,
        target: { kind: 'scheduleItemAmount', index: 0 },
      },
    ]);
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
      debtPlanIssueCode.scheduleItemCountInvalid,
      debtPlanIssueCode.scheduleItemAmountNotPositive,
      debtPlanIssueCode.scheduleItemAmountDoesNotMatchTotal,
      debtPlanIssueCode.scheduleItemDueDateInvalid,
      debtPlanIssueCode.scheduleItemAmountDoesNotMatchTotal,
      debtPlanIssueCode.scheduleItemDueDateInvalid,
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
