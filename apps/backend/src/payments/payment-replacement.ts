import { and, asc, eq, inArray } from 'drizzle-orm';
import { paymentApiErrorCode, type ReplacePaymentRequest } from '@collectify/contracts';
import { formatMoney, parseMoney } from '@collectify/domain/money';
import { validatePayment } from '@collectify/domain/payment';

import type { Database } from '../database/database.service';
import { customers, debtScheduleItems, debts, payments } from '../database/schema';
import { loadPaidTotalsByScheduleItemId } from '../receivables';
import { getIstanbulBusinessDate } from '../shared/istanbul-business-date';
import { paymentException } from './payments.errors';

type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];
type PaymentRow = typeof payments.$inferSelect;
type DebtRow = typeof debts.$inferSelect;
type ScheduleItemRow = typeof debtScheduleItems.$inferSelect;

export type ReplacePaymentCommand = {
  ownerProfileId: string;
  customerId: string;
  paymentId: string;
  request: ReplacePaymentRequest;
};

export type ReplacePaymentResult = {
  payment: PaymentRow;
  sourceDebt: DebtRow;
  destinationDebt: DebtRow;
};

export async function replacePayment(
  tx: Transaction,
  command: ReplacePaymentCommand,
): Promise<ReplacePaymentResult> {
  const source = await findOwnedPaymentSource(tx, command);

  if (!source) {
    throw paymentException(paymentApiErrorCode.paymentNotFound);
  }

  const target = await findOwnedPaymentTarget(tx, {
    ownerProfileId: command.ownerProfileId,
    customerId: command.customerId,
    scheduleItemId: command.request.targetScheduleItemId,
  });

  if (!target) {
    throw paymentException(paymentApiErrorCode.paymentTargetNotFound);
  }

  const debtIds = [...new Set([source.debtId, target.debtId])].sort();
  const lockedDebts = await lockOwnedDebts(tx, {
    ownerProfileId: command.ownerProfileId,
    customerId: command.customerId,
    debtIds,
  });
  const debtById = new Map(lockedDebts.map((debt) => [debt.id, debt]));
  const sourceDebt = debtById.get(source.debtId);
  const destinationDebt = debtById.get(target.debtId);

  if (!sourceDebt || !destinationDebt) {
    throw paymentException(paymentApiErrorCode.paymentNotFound);
  }

  if (sourceDebt.version !== command.request.expectedSourceDebtVersion) {
    throw paymentException(paymentApiErrorCode.paymentDebtVersionConflict);
  }

  if (
    sourceDebt.id !== destinationDebt.id &&
    destinationDebt.version !== command.request.expectedDestinationDebtVersion
  ) {
    throw paymentException(paymentApiErrorCode.paymentDebtVersionConflict);
  }

  const scheduleItemIds = [...new Set([source.scheduleItemId, target.scheduleItemId])].sort();
  const lockedScheduleItems = await lockScheduleItems(tx, scheduleItemIds);
  const scheduleItemById = new Map(
    lockedScheduleItems.map((scheduleItem) => [scheduleItem.id, scheduleItem]),
  );
  const sourceScheduleItem = scheduleItemById.get(source.scheduleItemId);
  const destinationScheduleItem = scheduleItemById.get(target.scheduleItemId);

  if (!sourceScheduleItem || !destinationScheduleItem) {
    throw paymentException(paymentApiErrorCode.paymentTargetNotFound);
  }

  const payment = await lockPayment(tx, command.paymentId);

  if (!payment || payment.scheduleItemId !== sourceScheduleItem.id) {
    throw paymentException(paymentApiErrorCode.paymentNotFound);
  }

  const paidTotals = await loadPaidTotalsByScheduleItemId(tx, [
    sourceScheduleItem.id,
    destinationScheduleItem.id,
  ]);
  const sourcePaidAmount = parseMoney(paidTotals.get(sourceScheduleItem.id) ?? '0.00');
  const destinationPaidAmount = parseMoney(
    paidTotals.get(destinationScheduleItem.id) ?? '0.00',
  );
  const persistedAmount = parseMoney(payment.amount);
  const targetPaidAmount =
    sourceScheduleItem.id === destinationScheduleItem.id
      ? sourcePaidAmount - persistedAmount
      : destinationPaidAmount;
  const maximumReplacementAmount = formatMoney(
    parseMoney(destinationScheduleItem.amount) - targetPaidAmount,
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
      scheduleItemId: destinationScheduleItem.id,
      amount: command.request.amount,
      paymentDate: command.request.paymentDate,
      note: command.request.note,
      updatedAt: operationInstant,
    })
    .where(eq(payments.id, payment.id))
    .returning();

  if (!updatedPayment) {
    throw paymentException(paymentApiErrorCode.paymentNotFound);
  }

  const updatedDebts = new Map<string, DebtRow>();
  for (const debt of lockedDebts) {
    const [updatedDebt] = await tx
      .update(debts)
      .set({
        version: debt.version + 1,
        updatedAt: operationInstant,
      })
      .where(and(eq(debts.id, debt.id), eq(debts.version, debt.version)))
      .returning();

    if (!updatedDebt) {
      throw paymentException(paymentApiErrorCode.paymentDebtVersionConflict);
    }

    updatedDebts.set(updatedDebt.id, updatedDebt);
  }

  return {
    payment: updatedPayment,
    sourceDebt: updatedDebts.get(sourceDebt.id)!,
    destinationDebt: updatedDebts.get(destinationDebt.id)!,
  };
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

async function findOwnedPaymentTarget(
  tx: Transaction,
  input: {
    ownerProfileId: string;
    customerId: string;
    scheduleItemId: string;
  },
): Promise<{ debtId: string; scheduleItemId: string } | null> {
  const [row] = await tx
    .select({
      debtId: debts.id,
      scheduleItemId: debtScheduleItems.id,
    })
    .from(debtScheduleItems)
    .innerJoin(debts, eq(debts.id, debtScheduleItems.debtId))
    .innerJoin(customers, eq(customers.id, debts.customerId))
    .where(
      and(
        eq(debtScheduleItems.id, input.scheduleItemId),
        eq(debts.customerId, input.customerId),
        eq(customers.ownerProfileId, input.ownerProfileId),
      ),
    )
    .limit(1);

  return row ?? null;
}

async function lockOwnedDebts(
  tx: Transaction,
  input: {
    ownerProfileId: string;
    customerId: string;
    debtIds: readonly string[];
  },
): Promise<DebtRow[]> {
  if (input.debtIds.length === 0) return [];

  return tx
    .select({ debt: debts })
    .from(debts)
    .innerJoin(customers, eq(customers.id, debts.customerId))
    .where(
      and(
        inArray(debts.id, input.debtIds),
        eq(debts.customerId, input.customerId),
        eq(customers.ownerProfileId, input.ownerProfileId),
      ),
    )
    .orderBy(asc(debts.id))
    .for('update', { of: debts })
    .then((rows) => rows.map(({ debt }) => debt));
}

async function lockScheduleItems(
  tx: Transaction,
  scheduleItemIds: readonly string[],
): Promise<ScheduleItemRow[]> {
  if (scheduleItemIds.length === 0) return [];

  return tx
    .select()
    .from(debtScheduleItems)
    .where(inArray(debtScheduleItems.id, scheduleItemIds))
    .orderBy(asc(debtScheduleItems.id))
    .for('update')
    .then((rows) => rows);
}

async function lockPayment(tx: Transaction, paymentId: string): Promise<PaymentRow | null> {
  const [row] = await tx
    .select()
    .from(payments)
    .where(eq(payments.id, paymentId))
    .limit(1)
    .for('update');

  return row ?? null;
}
