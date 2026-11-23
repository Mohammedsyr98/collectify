import { and, eq } from 'drizzle-orm';
import { paymentApiErrorCode, type ReplacePaymentRequest } from '@collectify/contracts';
import { formatMoney, parseMoney } from '@collectify/domain/money';
import { validatePayment } from '@collectify/domain/payment';

import type { Database } from '../database/database.service';
import { customers, debtScheduleItems, debts, payments } from '../database/schema';
import { findOwnedDebtForUpdate } from '../debts';
import { loadPaidTotalsByScheduleItemId } from '../receivables';
import { getIstanbulBusinessDate } from '../shared/istanbul-business-date';
import { paymentException } from './payments.errors';

type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];
type PaymentRow = typeof payments.$inferSelect;

type ReplacePaymentCommand = {
  ownerProfileId: string;
  customerId: string;
  paymentId: string;
  request: ReplacePaymentRequest;
};

export async function replacePayment(
  tx: Transaction,
  command: ReplacePaymentCommand,
): Promise<PaymentRow> {
  const source = await findOwnedPaymentSource(tx, command);

  if (!source) {
    throw paymentException(paymentApiErrorCode.paymentNotFound);
  }

  const debt = await findOwnedDebtForUpdate(tx, {
    ownerProfileId: command.ownerProfileId,
    customerId: command.customerId,
    debtId: source.debtId,
  });

  if (!debt) {
    throw paymentException(paymentApiErrorCode.paymentNotFound);
  }

  if (debt.version !== command.request.expectedSourceDebtVersion) {
    throw paymentException(paymentApiErrorCode.paymentDebtVersionConflict);
  }

  const scheduleItem = await lockScheduleItem(tx, debt.id, source.scheduleItemId);
  const payment = await lockPayment(tx, command.paymentId, source.scheduleItemId);

  if (!scheduleItem || !payment) {
    throw paymentException(paymentApiErrorCode.paymentNotFound);
  }

  const paidTotals = await loadPaidTotalsByScheduleItemId(tx, [scheduleItem.id]);
  const totalPaid = parseMoney(paidTotals.get(scheduleItem.id) ?? '0.00');
  const persistedAmount = parseMoney(payment.amount);
  const maximumReplacementAmount = formatMoney(
    parseMoney(scheduleItem.amount) - totalPaid + persistedAmount,
  );
  const operationInstant = new Date();
  const validation = validatePayment({
    amount: command.request.amount,
    remainingAmount: maximumReplacementAmount,
    paymentDate: command.request.paymentDate,
    businessDate: getIstanbulBusinessDate(operationInstant),
  });

  if (!validation.success) {
    throw paymentException(validation.issues[0]!.code);
  }

  const [updatedPayment] = await tx
    .update(payments)
    .set({
      amount: command.request.amount,
      paymentDate: command.request.paymentDate,
      note: command.request.note,
      updatedAt: operationInstant,
    })
    .where(
      and(
        eq(payments.id, payment.id),
        eq(payments.scheduleItemId, scheduleItem.id),
      ),
    )
    .returning();

  if (!updatedPayment) {
    throw paymentException(paymentApiErrorCode.paymentNotFound);
  }

  const [updatedDebt] = await tx
    .update(debts)
    .set({
      version: debt.version + 1,
      updatedAt: operationInstant,
    })
    .where(and(eq(debts.id, debt.id), eq(debts.version, debt.version)))
    .returning({ id: debts.id });

  if (!updatedDebt) {
    throw paymentException(paymentApiErrorCode.paymentDebtVersionConflict);
  }

  return updatedPayment;
}

async function findOwnedPaymentSource(
  tx: Transaction,
  command: ReplacePaymentCommand,
): Promise<{ debtId: string; scheduleItemId: string } | null> {
  const [row] = await tx
    .select({
      debtId: debts.id,
      scheduleItemId: payments.scheduleItemId,
    })
    .from(payments)
    .innerJoin(debtScheduleItems, eq(debtScheduleItems.id, payments.scheduleItemId))
    .innerJoin(debts, eq(debts.id, debtScheduleItems.debtId))
    .innerJoin(customers, eq(customers.id, debts.customerId))
    .where(
      and(
        eq(payments.id, command.paymentId),
        eq(debts.customerId, command.customerId),
        eq(customers.ownerProfileId, command.ownerProfileId),
      ),
    )
    .limit(1);

  return row ?? null;
}

async function lockScheduleItem(
  tx: Transaction,
  debtId: string,
  scheduleItemId: string,
) {
  const [row] = await tx
    .select()
    .from(debtScheduleItems)
    .where(
      and(
        eq(debtScheduleItems.id, scheduleItemId),
        eq(debtScheduleItems.debtId, debtId),
      ),
    )
    .limit(1)
    .for('update');

  return row ?? null;
}

async function lockPayment(
  tx: Transaction,
  paymentId: string,
  scheduleItemId: string,
) {
  const [row] = await tx
    .select()
    .from(payments)
    .where(
      and(
        eq(payments.id, paymentId),
        eq(payments.scheduleItemId, scheduleItemId),
      ),
    )
    .limit(1)
    .for('update');

  return row ?? null;
}
