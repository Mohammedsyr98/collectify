import type {
  DebtListResponse,
  DebtResponse,
  PaymentState,
} from '@collectify/contracts';

type OnePaymentDebtResponse = Extract<
  DebtResponse,
  { paymentPlanType: 'onePayment' }
>;

type InstallmentDebtResponse = Extract<
  DebtResponse,
  { paymentPlanType: 'installment' }
>;

type PaymentSummaryFixture = {
  paidAmount: string;
  remainingAmount: string;
  paymentState: PaymentState;
  paymentCount: number;
};

type ScheduleItemOverrides = {
  id: string;
  position: number;
  amount: string;
  dueDate: string;
  timing: 'upcoming' | 'dueToday' | 'overdue';
} & Partial<PaymentSummaryFixture>;

type OnePaymentDebtOverrides = Omit<
  Partial<OnePaymentDebtResponse>,
  'customerId' | 'scheduleItems'
> & {
  scheduleItems?: [ScheduleItemOverrides];
};

type InstallmentDebtOverrides = Omit<
  Partial<InstallmentDebtResponse>,
  'customerId' | 'scheduleItems'
> & {
  scheduleItems?: ScheduleItemOverrides[];
};

export const emptyDebtList: DebtListResponse = {
  items: [],
  page: 1,
  pageSize: 5,
  totalItems: 0,
  totalPages: 0,
};

export function createDebtFixture(
  customerId: string,
  overrides: OnePaymentDebtOverrides = {},
): OnePaymentDebtResponse {
  const {
    scheduleItems: scheduleItemOverrides,
    totalAmount = '125.50',
    ...debtOverrides
  } = overrides;
  const paymentSummary = createPaymentSummary(totalAmount, debtOverrides);
  const scheduleItem = (
    scheduleItemOverrides ?? [
      {
        id: 'schedule_123',
        position: 1,
        amount: totalAmount,
        dueDate: '2026-09-30',
        timing: 'upcoming',
      },
    ]
  )[0]!;
  const scheduleItems: OnePaymentDebtResponse['scheduleItems'] = [
    {
      ...scheduleItem,
      ...createPaymentSummary(scheduleItem.amount, scheduleItem),
      position: 1,
    },
  ];

  return {
    id: 'debt_123',
    customerId,
    description: 'Website redesign',
    totalAmount,
    ...paymentSummary,
    currency: 'USD',
    paymentPlanType: 'onePayment',
    scheduleItems,
    createdAt: '2026-09-12T10:00:00.000Z',
    updatedAt: '2026-09-12T10:00:00.000Z',
    version: 1,
    ...debtOverrides,
  };
}

export function createInstallmentDebtFixture(
  customerId: string,
  overrides: InstallmentDebtOverrides = {},
): InstallmentDebtResponse {
  const {
    scheduleItems: scheduleItemOverrides,
    totalAmount = '100.00',
    ...debtOverrides
  } = overrides;
  const paymentSummary = createPaymentSummary(totalAmount, debtOverrides);
  const scheduleItems: InstallmentDebtResponse['scheduleItems'] = (
    scheduleItemOverrides ?? [
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
    ]
  ).map((scheduleItem) => ({
    ...scheduleItem,
    ...createPaymentSummary(scheduleItem.amount, scheduleItem),
  }));

  return {
    id: 'debt_installments_123',
    customerId,
    description: 'Website redesign installments',
    totalAmount,
    ...paymentSummary,
    currency: 'USD',
    paymentPlanType: 'installment',
    scheduleItems,
    createdAt: '2026-09-12T10:00:00.000Z',
    updatedAt: '2026-09-12T10:00:00.000Z',
    version: 1,
    ...debtOverrides,
  };
}

function createPaymentSummary(
  amount: string,
  overrides: Partial<PaymentSummaryFixture>,
): PaymentSummaryFixture {
  return {
    paidAmount: overrides.paidAmount ?? '0.00',
    remainingAmount: overrides.remainingAmount ?? amount,
    paymentState: overrides.paymentState ?? 'unpaid',
    paymentCount: overrides.paymentCount ?? 0,
  };
}
