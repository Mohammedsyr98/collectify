import { describe, expect, it } from 'vitest';

import { debtPlanIssueCode, debtRequestValidationCode } from '@collectify/contracts';

import { buildAutomaticSchedulePreview, debtDraftSchema } from './debt-draft';

describe('debtDraftSchema', () => {
  it('uses its normalized total when deriving an automatic schedule', () => {
    const draft = {
      description: 'Website redesign',
      totalAmount: ' 100 ',
      currency: 'USD' as const,
      paymentPlan: 'installment' as const,
      onePayment: {
        dueDate: '',
      },
      installmentPlan: {
        mode: 'automatic' as const,
        automatic: {
          installmentCount: '2',
          frequency: 'monthly' as const,
          firstInstallmentDueDate: '2026-10-01',
        },
        manual: {
          scheduleItems: [],
        },
      },
    };

    const request = debtDraftSchema.safeParse(draft);
    const preview = buildAutomaticSchedulePreview({
      automatic: draft.installmentPlan.automatic,
      totalAmount: draft.totalAmount,
    });

    expect(request.success).toBe(true);
    expect(preview).toBeDefined();
    if (!request.success || preview === undefined) return;

    expect(preview.scheduleItems).toEqual(request.data.scheduleItems);
  });

  it('reports common and active manual-plan errors on native draft paths', () => {
    const result = debtDraftSchema.safeParse({
      description: '',
      totalAmount: '100',
      currency: 'USD',
      paymentPlan: 'installment',
      onePayment: {
        dueDate: '',
      },
      installmentPlan: {
        mode: 'manual',
        automatic: {
          installmentCount: '2',
          frequency: 'monthly',
          firstInstallmentDueDate: '',
        },
        manual: {
          scheduleItems: [
            { amount: '40', dueDate: '2026-10-01' },
            { amount: '40', dueDate: '2026-11-01' },
          ],
        },
      },
    });

    expect(result.success).toBe(false);
    if (result.success) return;

    expect(result.error.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: ['description'],
          message: debtRequestValidationCode.debtDescriptionRequired,
        }),
        expect.objectContaining({
          path: ['installmentPlan', 'manual', 'scheduleItems', 'root'],
          message: debtPlanIssueCode.scheduleTotalAmountMismatch,
        }),
      ]),
    );
  });

  it('rejects an automatic plan when its installment count exceeds the amount-supported maximum', () => {
    const draft = {
      description: 'Website redesign',
      totalAmount: '0.02',
      currency: 'USD' as const,
      paymentPlan: 'installment' as const,
      onePayment: {
        dueDate: '',
      },
      installmentPlan: {
        mode: 'automatic' as const,
        automatic: {
          installmentCount: '3',
          frequency: 'monthly' as const,
          firstInstallmentDueDate: '2026-10-01',
        },
        manual: {
          scheduleItems: [],
        },
      },
    };

    const request = debtDraftSchema.safeParse(draft);
    const preview = buildAutomaticSchedulePreview({
      automatic: draft.installmentPlan.automatic,
      totalAmount: draft.totalAmount,
    });

    expect(request.success).toBe(false);
    if (request.success) return;

    expect(request.error.issues).toContainEqual(
      expect.objectContaining({
        path: ['installmentPlan', 'automatic', 'installmentCount'],
        message: debtPlanIssueCode.scheduleItemCountInvalid,
      }),
    );
    expect(preview).toBeUndefined();
  });

  it('rejects a nonexistent calendar date for the first installment', () => {
    const draft = {
      description: 'Website redesign',
      totalAmount: '100',
      currency: 'USD' as const,
      paymentPlan: 'installment' as const,
      onePayment: {
        dueDate: '',
      },
      installmentPlan: {
        mode: 'automatic' as const,
        automatic: {
          installmentCount: '2',
          frequency: 'monthly' as const,
          firstInstallmentDueDate: '2026-02-29',
        },
        manual: {
          scheduleItems: [],
        },
      },
    };

    const request = debtDraftSchema.safeParse(draft);
    const preview = buildAutomaticSchedulePreview({
      automatic: draft.installmentPlan.automatic,
      totalAmount: draft.totalAmount,
    });

    expect(request.success).toBe(false);
    if (request.success) return;

    expect(request.error.issues).toContainEqual(
      expect.objectContaining({
        path: ['installmentPlan', 'automatic', 'firstInstallmentDueDate'],
        message: debtPlanIssueCode.scheduleItemDueDateInvalid,
      }),
    );
    expect(preview).toBeUndefined();
  });

  it('rejects an automatic schedule that exceeds the supported calendar range', () => {
    const draft = {
      description: 'Website redesign',
      totalAmount: '100',
      currency: 'USD' as const,
      paymentPlan: 'installment' as const,
      onePayment: {
        dueDate: '',
      },
      installmentPlan: {
        mode: 'automatic' as const,
        automatic: {
          installmentCount: '2',
          frequency: 'monthly' as const,
          firstInstallmentDueDate: '9999-12-31',
        },
        manual: {
          scheduleItems: [],
        },
      },
    };

    const request = debtDraftSchema.safeParse(draft);
    const preview = buildAutomaticSchedulePreview({
      automatic: draft.installmentPlan.automatic,
      totalAmount: draft.totalAmount,
    });

    expect(request.success).toBe(false);
    if (request.success) return;

    expect(request.error.issues).toContainEqual(
      expect.objectContaining({
        path: ['installmentPlan', 'automatic', 'firstInstallmentDueDate'],
        message: debtPlanIssueCode.scheduleItemDueDateInvalid,
      }),
    );
    expect(preview).toBeUndefined();
  });
});
