import { formatMoney, parseMoney } from '../money/index.js';

export type ScheduleItemPaymentState = {
  readonly paidAmount: string;
  readonly remainingAmount: string;
  readonly paymentState: 'unpaid' | 'partiallyPaid' | 'paid';
};

export type ScheduleItemPaymentStateInput = {
  readonly scheduledAmount: string;
  readonly paymentAmounts: readonly string[];
};

export const scheduleItemPaymentIssueCode = {
  paymentAmountExceedsAvailableBalance:
    'PAYMENT_AMOUNT_EXCEEDS_AVAILABLE_BALANCE',
} as const;

export type ScheduleItemPaymentIssueCode =
  (typeof scheduleItemPaymentIssueCode)[keyof typeof scheduleItemPaymentIssueCode];

export type ScheduleItemPaymentStateResult =
  | {
      readonly success: true;
      readonly state: ScheduleItemPaymentState;
    }
  | {
      readonly success: false;
      readonly issue: ScheduleItemPaymentIssueCode;
    };

export function calculateScheduleItemPaymentState(
  input: ScheduleItemPaymentStateInput,
): ScheduleItemPaymentStateResult {
  const scheduledMinorUnits = parseMoney(input.scheduledAmount);
  const paidMinorUnits = input.paymentAmounts.reduce(
    (total, paymentAmount) => total + parseMoney(paymentAmount),
    0n,
  );

  if (paidMinorUnits > scheduledMinorUnits) {
    return {
      success: false,
      issue: scheduleItemPaymentIssueCode.paymentAmountExceedsAvailableBalance,
    };
  }

  const remainingMinorUnits = scheduledMinorUnits - paidMinorUnits;

  return {
    success: true,
    state: {
      paidAmount: formatMoney(paidMinorUnits),
      remainingAmount: formatMoney(remainingMinorUnits),
      paymentState:
        paidMinorUnits === 0n
          ? 'unpaid'
          : paidMinorUnits === scheduledMinorUnits
            ? 'paid'
            : 'partiallyPaid',
    },
  };
}
