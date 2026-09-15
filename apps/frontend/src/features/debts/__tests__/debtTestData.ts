import type { DebtListResponse, DebtResponse } from '@collectify/contracts';

export const emptyDebtList: DebtListResponse = {
  items: [],
  page: 1,
  pageSize: 5,
  totalItems: 0,
  totalPages: 0,
};

export function createDebtFixture(
  customerId: string,
  overrides: Omit<Partial<DebtResponse>, 'customerId'> = {},
): DebtResponse {
  return {
    id: 'debt_123',
    customerId,
    description: 'Website redesign',
    totalAmount: '125.50',
    currency: 'USD',
    paymentPlanType: 'onePayment',
    scheduleItems: [
      {
        id: 'schedule_123',
        position: 1,
        amount: '125.50',
        dueDate: '2026-09-30',
        timing: 'upcoming',
      },
    ],
    createdAt: '2026-09-12T10:00:00.000Z',
    updatedAt: '2026-09-12T10:00:00.000Z',
    ...overrides,
  };
}
