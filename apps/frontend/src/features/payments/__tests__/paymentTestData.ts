import type { PaymentTarget } from '@collectify/contracts';

export function createPaymentTargetFixture(overrides: Partial<PaymentTarget> = {}): PaymentTarget {
  return {
    scheduleItemId: 'schedule_1',
    debtId: 'debt_1',
    debtDescription: 'Office equipment',
    currency: 'USD',
    debtVersion: 1,
    amount: '100.00',
    remainingAmount: '75.00',
    dueDate: '2026-10-01',
    timing: 'overdue',
    paymentState: 'partiallyPaid',
    plan: { type: 'onePayment' },
    ...overrides,
  };
}
