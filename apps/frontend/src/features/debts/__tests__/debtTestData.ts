import type { DebtListResponse, DebtResponse } from '@collectify/contracts';

type OnePaymentDebtResponse = Extract<
  DebtResponse,
  { paymentPlanType: 'onePayment' }
>;

type InstallmentDebtResponse = Extract<
  DebtResponse,
  { paymentPlanType: 'installment' }
>;

export const emptyDebtList: DebtListResponse = {
  items: [],
  page: 1,
  pageSize: 5,
  totalItems: 0,
  totalPages: 0,
};

export function createDebtFixture(
  customerId: string,
  overrides: Omit<Partial<OnePaymentDebtResponse>, 'customerId'> = {},
): OnePaymentDebtResponse {
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
    version: 1,
    ...overrides,
  };
}

export function createInstallmentDebtFixture(
  customerId: string,
  overrides: Omit<Partial<InstallmentDebtResponse>, 'customerId'> = {},
): InstallmentDebtResponse {
  return {
    id: 'debt_installments_123',
    customerId,
    description: 'Website redesign installments',
    totalAmount: '100.00',
    currency: 'USD',
    paymentPlanType: 'installment',
    scheduleItems: [
      {
        id: 'schedule_installment_1',
        position: 1,
        amount: '20.00',
        dueDate: '2026-09-01',
        timing: 'overdue',
      },
      {
        id: 'schedule_installment_2',
        position: 2,
        amount: '30.00',
        dueDate: '2026-09-02',
        timing: 'overdue',
      },
      {
        id: 'schedule_installment_3',
        position: 3,
        amount: '25.00',
        dueDate: '2026-09-30',
        timing: 'dueToday',
      },
      {
        id: 'schedule_installment_4',
        position: 4,
        amount: '25.00',
        dueDate: '2026-10-30',
        timing: 'upcoming',
      },
    ],
    createdAt: '2026-09-12T10:00:00.000Z',
    updatedAt: '2026-09-12T10:00:00.000Z',
    version: 1,
    ...overrides,
  };
}
