import { and, asc, eq } from 'drizzle-orm';
import { debtApiErrorCode, type ReplaceDebtRequest } from '@collectify/contracts';
import { randomUUID } from 'node:crypto';

import type { Database } from '../database/database.service';
import { customers, debtScheduleItems, debts } from '../database/schema';
import { debtException } from './debts.errors';

type DebtRow = typeof debts.$inferSelect;
type DebtScheduleItemRow = typeof debtScheduleItems.$inferSelect;
type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];

type ReplaceDebtCommand = {
  ownerProfileId: string;
  customerId: string;
  debtId: string;
  request: ReplaceDebtRequest;
};

type ReplacedDebt = {
  debt: DebtRow;
  scheduleItems: DebtScheduleItemRow[];
};

export function replaceDebt(
  database: Database,
  command: ReplaceDebtCommand,
): Promise<ReplacedDebt> {
  const { request } = command;

  return database.transaction(async (tx) => {
    const lockedDebt = await lockDebtForReplacement(tx, command);

    if (lockedDebt.version !== request.expectedVersion) {
      throw debtException(debtApiErrorCode.debtVersionConflict);
    }

    const changedAt = new Date();

    await replaceOnePaymentSchedule(tx, {
      debtId: lockedDebt.id,
      scheduleItem: request.scheduleItems[0]!,
      changedAt,
    });

    const updatedDebt = (
      await tx
        .update(debts)
        .set({
          description: request.description,
          totalAmount: request.totalAmount,
          currency: request.currency,
          updatedAt: changedAt,
          version: lockedDebt.version + 1,
        })
        .where(eq(debts.id, lockedDebt.id))
        .returning()
    )[0]!;

    const scheduleItems = await loadDebtSchedule(tx, updatedDebt.id);

    return { debt: updatedDebt, scheduleItems };
  });
}

async function lockDebtForReplacement(
  tx: Transaction,
  command: ReplaceDebtCommand,
): Promise<DebtRow> {
  const [lockedDebt] = await tx
    .select({ debt: debts })
    .from(debts)
    .innerJoin(customers, eq(customers.id, debts.customerId))
    .where(
      and(
        eq(debts.id, command.debtId),
        eq(debts.customerId, command.customerId),
        eq(customers.ownerProfileId, command.ownerProfileId),
      ),
    )
    .limit(1)
    .for('update', { of: debts });

  if (!lockedDebt) {
    throw debtException(debtApiErrorCode.debtNotFound);
  }

  return lockedDebt.debt;
}

async function replaceOnePaymentSchedule(
  tx: Transaction,
  {
    debtId,
    scheduleItem,
    changedAt,
  }: {
    debtId: string;
    scheduleItem: ReplaceDebtRequest['scheduleItems'][number];
    changedAt: Date;
  },
): Promise<void> {
  if (scheduleItem.id) {
    const [updatedScheduleItem] = await tx
      .update(debtScheduleItems)
      .set({
        amount: scheduleItem.amount,
        dueDate: scheduleItem.dueDate,
        updatedAt: changedAt,
      })
      .where(and(eq(debtScheduleItems.id, scheduleItem.id), eq(debtScheduleItems.debtId, debtId)))
      .returning();

    if (!updatedScheduleItem) {
      throw debtException(debtApiErrorCode.debtNotFound);
    }

    return;
  }

  const [deletedScheduleItem] = await tx
    .delete(debtScheduleItems)
    .where(and(eq(debtScheduleItems.debtId, debtId), eq(debtScheduleItems.position, 1)))
    .returning();

  if (!deletedScheduleItem) {
    throw debtException(debtApiErrorCode.debtNotFound);
  }

  const [insertedScheduleItem] = await tx
    .insert(debtScheduleItems)
    .values({
      id: randomUUID(),
      debtId,
      position: deletedScheduleItem.position,
      amount: scheduleItem.amount,
      dueDate: scheduleItem.dueDate,
      createdAt: changedAt,
      updatedAt: changedAt,
    })
    .returning();

  if (!insertedScheduleItem) {
    throw debtException(debtApiErrorCode.debtNotFound);
  }
}

async function loadDebtSchedule(tx: Transaction, debtId: string): Promise<DebtScheduleItemRow[]> {
  return tx
    .select()
    .from(debtScheduleItems)
    .where(eq(debtScheduleItems.debtId, debtId))
    .orderBy(asc(debtScheduleItems.position));
}
