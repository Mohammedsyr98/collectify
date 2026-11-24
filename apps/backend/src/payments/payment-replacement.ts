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
type PaymentLocation = { debtId: string; scheduleItemId: string };

type PaymentReplacementTargets = {
  source: PaymentLocation;
  destination: PaymentLocation;
};

type LockedPaymentReplacement = {
  lockedDebts: DebtRow[];
  sourceDebt: DebtRow;
  destinationDebt: DebtRow;
  sourceScheduleItem: ScheduleItemRow;
  destinationScheduleItem: ScheduleItemRow;
  payment: PaymentRow;
};

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
  const targets = await findOwnedPaymentReplacementTargets(tx, command);
  const lockedDebts = await lockPaymentReplacementDebts(tx, command, targets);

  assertExpectedDebtVersions(command.request, lockedDebts);

  const replacement = await lockReplacementScheduleItemsAndPayment(
    tx,
    command.paymentId,
    targets,
    lockedDebts,
  );
  const availableToPayAmount = await calculateAvailableToPayAmountForReplacement(tx, replacement);
  const operationInstant = new Date();
  validateReplacementAmount(command.request, availableToPayAmount, operationInstant);

  return persistPaymentReplacement(tx, command.request, replacement, operationInstant);
}

async function findOwnedPaymentReplacementTargets(
  tx: Transaction,
  command: ReplacePaymentCommand,
): Promise<PaymentReplacementTargets> {
  const source = await findOwnedPaymentSource(tx, command);

  if (!source) {
    throw paymentException(paymentApiErrorCode.paymentNotFound);
  }

  const destination = await findOwnedPaymentTarget(tx, {
    ownerProfileId: command.ownerProfileId,
    customerId: command.customerId,
    scheduleItemId: command.request.targetScheduleItemId,
  });

  if (!destination) {
    throw paymentException(paymentApiErrorCode.paymentTargetNotFound);
  }

  return { source, destination };
}

async function lockPaymentReplacementDebts(
  tx: Transaction,
  command: ReplacePaymentCommand,
  targets: PaymentReplacementTargets,
): Promise<Pick<LockedPaymentReplacement, 'lockedDebts' | 'sourceDebt' | 'destinationDebt'>> {
  const debtIds = [...new Set([targets.source.debtId, targets.destination.debtId])].sort();
  const lockedDebts = await lockOwnedDebts(tx, {
    ownerProfileId: command.ownerProfileId,
    customerId: command.customerId,
    debtIds,
  });
  const sourceDebt = lockedDebts.find(({ id }) => id === targets.source.debtId);
  const destinationDebt = lockedDebts.find(({ id }) => id === targets.destination.debtId);

  if (!sourceDebt || !destinationDebt) {
    throw paymentException(paymentApiErrorCode.paymentNotFound);
  }

  return { lockedDebts, sourceDebt, destinationDebt };
}

function assertExpectedDebtVersions(
  request: ReplacePaymentRequest,
  replacementDebts: Pick<LockedPaymentReplacement, 'sourceDebt' | 'destinationDebt'>,
): void {
  if (replacementDebts.sourceDebt.version !== request.expectedSourceDebtVersion) {
    throw paymentException(paymentApiErrorCode.paymentDebtVersionConflict);
  }

  if (
    replacementDebts.sourceDebt.id !== replacementDebts.destinationDebt.id &&
    replacementDebts.destinationDebt.version !== request.expectedDestinationDebtVersion
  ) {
    throw paymentException(paymentApiErrorCode.paymentDebtVersionConflict);
  }
}

async function lockReplacementScheduleItemsAndPayment(
  tx: Transaction,
  paymentId: string,
  targets: PaymentReplacementTargets,
  lockedDebts: Pick<LockedPaymentReplacement, 'lockedDebts' | 'sourceDebt' | 'destinationDebt'>,
): Promise<LockedPaymentReplacement> {
  // Debt rows are locked by the caller; lock schedule rows before the payment row.
  const scheduleItemIds = [
    ...new Set([targets.source.scheduleItemId, targets.destination.scheduleItemId]),
  ].sort();
  const lockedScheduleItems = await lockScheduleItems(tx, scheduleItemIds);
  const sourceScheduleItem = lockedScheduleItems.find(
    ({ id }) => id === targets.source.scheduleItemId,
  );
  const destinationScheduleItem = lockedScheduleItems.find(
    ({ id }) => id === targets.destination.scheduleItemId,
  );

  if (!sourceScheduleItem || !destinationScheduleItem) {
    throw paymentException(paymentApiErrorCode.paymentTargetNotFound);
  }

  const payment = await lockPayment(tx, paymentId);

  if (!payment || payment.scheduleItemId !== sourceScheduleItem.id) {
    throw paymentException(paymentApiErrorCode.paymentNotFound);
  }

  return {
    ...lockedDebts,
    sourceScheduleItem,
    destinationScheduleItem,
    payment,
  };
}

async function calculateAvailableToPayAmountForReplacement(
  tx: Transaction,
  replacement: LockedPaymentReplacement,
): Promise<string> {
  const { sourceScheduleItem, destinationScheduleItem, payment } = replacement;
  const paidTotals = await loadPaidTotalsByScheduleItemId(tx, [
    sourceScheduleItem.id,
    destinationScheduleItem.id,
  ]);
  const sourcePaidAmount = parseMoney(paidTotals.get(sourceScheduleItem.id) ?? '0.00');
  const destinationPaidAmount = parseMoney(paidTotals.get(destinationScheduleItem.id) ?? '0.00');
  const persistedAmount = parseMoney(payment.amount);
  const destinationPaidAmountAfterRemovingPayment =
    sourceScheduleItem.id === destinationScheduleItem.id
      ? sourcePaidAmount - persistedAmount
      : destinationPaidAmount;
  return formatMoney(
    parseMoney(destinationScheduleItem.amount) - destinationPaidAmountAfterRemovingPayment,
  );
}

function validateReplacementAmount(
  request: ReplacePaymentRequest,
  availableToPayAmount: string,
  operationInstant: Date,
): void {
  const validation = validatePayment({
    amount: request.amount,
    remainingAmount: availableToPayAmount,
    paymentDate: request.paymentDate,
    businessDate: getIstanbulBusinessDate(operationInstant),
  });

  if (!validation.success) {
    throw paymentException(validation.issues[0]!.code);
  }
}

async function persistPaymentReplacement(
  tx: Transaction,
  request: ReplacePaymentRequest,
  replacement: LockedPaymentReplacement,
  operationInstant: Date,
): Promise<ReplacePaymentResult> {
  const [payment] = await tx
    .update(payments)
    .set({
      scheduleItemId: replacement.destinationScheduleItem.id,
      amount: request.amount,
      paymentDate: request.paymentDate,
      note: request.note,
      updatedAt: operationInstant,
    })
    .where(eq(payments.id, replacement.payment.id))
    .returning();

  if (!payment) {
    throw paymentException(paymentApiErrorCode.paymentNotFound);
  }

  const updatedDebts: DebtRow[] = [];

  for (const debt of replacement.lockedDebts) {
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

    updatedDebts.push(updatedDebt);
  }

  const sourceDebt = updatedDebts.find(({ id }) => id === replacement.sourceDebt.id);
  const destinationDebt = updatedDebts.find(({ id }) => id === replacement.destinationDebt.id);

  if (!sourceDebt || !destinationDebt) {
    throw new Error('Payment replacement did not update all affected debts.');
  }

  return { payment, sourceDebt, destinationDebt };
}

async function findOwnedPaymentSource(
  tx: Transaction,
  command: ReplacePaymentCommand,
): Promise<PaymentLocation | null> {
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
): Promise<PaymentLocation | null> {
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
