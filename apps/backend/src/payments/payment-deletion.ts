import { and, eq } from 'drizzle-orm';

import {
  paymentApiErrorCode,
  type DeletePaymentRequest,
} from '@collectify/contracts';

import type { Database } from '../database/database.service';
import { customers, debtScheduleItems, debts, payments } from '../database/schema';
import { findOwnedDebtForUpdate } from '../debts';
import { paymentException } from './payments.errors';

type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];

export type PaymentDeletionCommand = {
  ownerProfileId: string;
  customerId: string;
  paymentId: string;
  request: DeletePaymentRequest;
};

export type PaymentDeletionResult = {
  paymentId: string;
  debtVersion: number;
};

export async function deletePayment(
  tx: Transaction,
  command: PaymentDeletionCommand,
  operationInstant: Date,
): Promise<PaymentDeletionResult> {
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

  if (debt.version !== command.request.expectedDebtVersion) {
    throw paymentException(paymentApiErrorCode.paymentDebtVersionConflict);
  }

  const [deletedPayment] = await tx
    .delete(payments)
    .where(
      and(
        eq(payments.id, command.paymentId),
        eq(payments.scheduleItemId, source.scheduleItemId),
      ),
    )
    .returning({ id: payments.id });

  if (!deletedPayment) {
    throw paymentException(paymentApiErrorCode.paymentNotFound);
  }

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

  return { paymentId: deletedPayment.id, debtVersion: updatedDebt.version };
}

async function findOwnedPaymentSource(
  tx: Transaction,
  command: PaymentDeletionCommand,
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
