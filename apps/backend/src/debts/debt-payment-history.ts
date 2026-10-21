import { debtApiErrorCode } from '@collectify/contracts';

type DebtPaymentHistoryConflictCode =
  | typeof debtApiErrorCode.debtHasPayments
  | typeof debtApiErrorCode.debtCurrencyChangeBlocked
  | typeof debtApiErrorCode.debtPaymentPlanChangeBlocked
  | typeof debtApiErrorCode.debtScheduleItemHasPayments
  | typeof debtApiErrorCode.debtScheduleItemAmountBelowPaid
  | typeof debtApiErrorCode.debtTotalAmountBelowPaid;

type DebtPaymentHistoryChange =
  | { kind: 'delete' }
  | {
      kind: 'replace';
      replacement: {
        currency: string;
        totalAmount: string;
        scheduleItems: readonly {
          id?: string;
          amount: string;
        }[];
      };
    };

type DebtPaymentHistoryInput = {
  currentDebt: {
    currency: string;
  };
  currentScheduleItems: readonly { id: string }[];
  paymentAmountsByScheduleItemId: ReadonlyMap<string, readonly string[]>;
  change: DebtPaymentHistoryChange;
};

export function checkDebtPaymentHistoryChange(
  input: DebtPaymentHistoryInput,
): DebtPaymentHistoryConflictCode | null {
  const receivedAmountsByScheduleItemId = sumPaymentsByScheduleItem(
    input.paymentAmountsByScheduleItemId,
  );
  const totalReceivedAmount = sumMinorUnits([
    ...receivedAmountsByScheduleItemId.values(),
  ]);

  if (input.change.kind === 'delete') {
    return totalReceivedAmount > 0n ? debtApiErrorCode.debtHasPayments : null;
  }

  if (totalReceivedAmount === 0n) {
    return null;
  }

  if (input.change.replacement.currency !== input.currentDebt.currency) {
    return debtApiErrorCode.debtCurrencyChangeBlocked;
  }

  const currentIsOnePayment = input.currentScheduleItems.length === 1;
  const replacementIsOnePayment = input.change.replacement.scheduleItems.length === 1;
  if (currentIsOnePayment !== replacementIsOnePayment) {
    return debtApiErrorCode.debtPaymentPlanChangeBlocked;
  }

  for (const [scheduleItemId, receivedAmount] of receivedAmountsByScheduleItemId) {
    const replacementItem = input.change.replacement.scheduleItems.find(
      ({ id }) => id === scheduleItemId,
    );
    if (!replacementItem) {
      return debtApiErrorCode.debtScheduleItemHasPayments;
    }

    if (toMinorUnits(replacementItem.amount) < receivedAmount) {
      return debtApiErrorCode.debtScheduleItemAmountBelowPaid;
    }
  }

  if (toMinorUnits(input.change.replacement.totalAmount) < totalReceivedAmount) {
    return debtApiErrorCode.debtTotalAmountBelowPaid;
  }

  return null;
}

function sumPaymentsByScheduleItem(
  paymentAmountsByScheduleItemId: ReadonlyMap<string, readonly string[]>,
): ReadonlyMap<string, bigint> {
  return new Map(
    [...paymentAmountsByScheduleItemId].map(
      ([scheduleItemId, amounts]) => [scheduleItemId, sumMoney(amounts)] as const,
    ),
  );
}

function sumMoney(amounts: readonly string[]): bigint {
  return sumMinorUnits(amounts.map(toMinorUnits));
}

function sumMinorUnits(amounts: readonly bigint[]): bigint {
  return amounts.reduce((total, amount) => total + amount, 0n);
}

function toMinorUnits(amount: string): bigint {
  const [whole, fraction = ''] = amount.split('.');
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0').slice(0, 2));
}
