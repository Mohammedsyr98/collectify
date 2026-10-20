import { type DebtResponse } from '@collectify/contracts';

import type { Database } from '../database/database.service';
import type { debts } from '../database/schema';
import {
  loadPaymentDetailsByDebtId,
  type PaymentSummary,
  type ScheduleItemPaymentDetails,
} from '../payments/payment-details-by-debt';
import { getScheduleItemTiming } from './debt-timing';

type SelectExecutor = Pick<Database, 'select'>;
type DebtRow = typeof debts.$inferSelect;

export async function loadDebtsWithPaymentDetails(
  executor: SelectExecutor,
  debtRows: readonly DebtRow[],
  businessDate: string,
): Promise<DebtResponse[]> {
  if (debtRows.length === 0) {
    return [];
  }

  const paymentDetailsByDebtId = await loadPaymentDetailsByDebtId(
    executor,
    debtRows.map(({ id }) => id),
  );

  return debtRows.map((debt) => {
    const paymentDetails = paymentDetailsByDebtId.get(debt.id);

    if (!paymentDetails) {
      throw new Error(`Debt response not found: ${debt.id}`);
    }

    return buildDebtResponse(
      debt,
      paymentDetails.scheduleItems,
      paymentDetails.paymentSummary,
      businessDate,
    );
  });
}

function buildDebtResponse(
  debt: typeof debts.$inferSelect,
  scheduleItems: ScheduleItemPaymentDetails[],
  paymentSummary: PaymentSummary,
  businessDate: string,
): DebtResponse {
  const responseScheduleItems = scheduleItems.map((scheduleItem) => ({
    id: scheduleItem.id,
    position: scheduleItem.position,
    amount: scheduleItem.amount,
    paidAmount: scheduleItem.paidAmount,
    remainingAmount: scheduleItem.remainingAmount,
    paymentState: scheduleItem.paymentState,
    paymentCount: scheduleItem.paymentCount,
    dueDate: scheduleItem.dueDate,
    timing: getScheduleItemTiming(scheduleItem.dueDate, businessDate),
  }));
  const debtResponseFields = {
    id: debt.id,
    customerId: debt.customerId,
    description: debt.description,
    totalAmount: debt.totalAmount,
    ...paymentSummary,
    currency: debt.currency,
    createdAt: debt.createdAt.toISOString(),
    updatedAt: debt.updatedAt.toISOString(),
    version: debt.version,
  };

  if (responseScheduleItems.length === 1) {
    const scheduleItem = responseScheduleItems[0]!;

    return {
      ...debtResponseFields,
      paymentPlanType: 'onePayment',
      scheduleItems: [
        {
          ...scheduleItem,
          position: 1,
        },
      ],
    };
  }

  return {
    ...debtResponseFields,
    paymentPlanType: 'installment',
    scheduleItems: responseScheduleItems,
  };
}
