import { and, asc, eq, inArray, sql } from 'drizzle-orm';
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

    const currentSchedule = await loadDebtSchedule(tx, lockedDebt.id);
    const scheduleChanges = buildScheduleChanges(
      currentSchedule,
      request.scheduleItems,
    );

    await applyScheduleChanges(tx, {
      debtId: lockedDebt.id,
      scheduleChanges,
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

type ScheduleChanges = {
  idsToDelete: string[];
  rowsToUpdate: Array<{
    id: string;
    position: number;
    amount: string;
    dueDate: string;
  }>;
  rowsToInsert: Array<{
    position: number;
    amount: string;
    dueDate: string;
  }>;
};

function buildScheduleChanges(
  currentSchedule: DebtScheduleItemRow[],
  submittedSchedule: ReplaceDebtRequest['scheduleItems'],
): ScheduleChanges {
  const currentIds = new Set(currentSchedule.map(({ id }) => id));
  const submittedIds = new Set(
    submittedSchedule.flatMap(({ id }) => (id ? [id] : [])),
  );

  if ([...submittedIds].some((id) => !currentIds.has(id))) {
    throw debtException(debtApiErrorCode.debtNotFound);
  }

  const idsToDelete = currentSchedule
    .map(({ id }) => id)
    .filter((id) => !submittedIds.has(id));
  const rowsToUpdate: ScheduleChanges['rowsToUpdate'] = [];
  const rowsToInsert: ScheduleChanges['rowsToInsert'] = [];

  for (const [index, scheduleItem] of submittedSchedule.entries()) {
    const position = index + 1;

    if (scheduleItem.id) {
      rowsToUpdate.push({
        id: scheduleItem.id,
        position,
        amount: scheduleItem.amount,
        dueDate: scheduleItem.dueDate,
      });
      continue;
    }

    rowsToInsert.push({
      position,
      amount: scheduleItem.amount,
      dueDate: scheduleItem.dueDate,
    });
  }

  return { idsToDelete, rowsToUpdate, rowsToInsert };
}

async function applyScheduleChanges(
  tx: Transaction,
  {
    debtId,
    scheduleChanges,
    changedAt,
  }: {
    debtId: string;
    scheduleChanges: ScheduleChanges;
    changedAt: Date;
  },
): Promise<void> {
  if (scheduleChanges.idsToDelete.length > 0) {
    await tx.delete(debtScheduleItems).where(
      and(
        eq(debtScheduleItems.debtId, debtId),
        inArray(debtScheduleItems.id, scheduleChanges.idsToDelete),
      ),
    );
  }

  await updateExistingScheduleRows(tx, {
    debtId,
    rows: scheduleChanges.rowsToUpdate,
    changedAt,
  });

  if (scheduleChanges.rowsToInsert.length > 0) {
    await tx.insert(debtScheduleItems).values(
      scheduleChanges.rowsToInsert.map((scheduleItem) => ({
        id: randomUUID(),
        debtId,
        position: scheduleItem.position,
        amount: scheduleItem.amount,
        dueDate: scheduleItem.dueDate,
        createdAt: changedAt,
        updatedAt: changedAt,
      })),
    );
  }
}

async function updateExistingScheduleRows(
  tx: Transaction,
  {
    debtId,
    rows,
    changedAt,
  }: {
    debtId: string;
    rows: ScheduleChanges['rowsToUpdate'];
    changedAt: Date;
  },
): Promise<void> {
  if (rows.length === 0) {
    return;
  }

  const values = sql.join(
    rows.map(
      (row) =>
        sql`(
          ${row.id}::text,
          ${row.position}::integer,
          ${row.amount}::numeric,
          ${row.dueDate}::date
        )`,
    ),
    sql`, `,
  );

  await tx.execute(sql`
    UPDATE "debt_schedule_items" AS item
    SET
      "position" = updates."position",
      "amount" = updates."amount",
      "due_date" = updates."due_date",
      "updated_at" = (${changedAt.toISOString()}::timestamptz AT TIME ZONE 'UTC')
    FROM (VALUES ${values}) AS updates(
      "id",
      "position",
      "amount",
      "due_date"
    )
    WHERE item."debt_id" = ${debtId}
      AND item."id" = updates."id"
  `);
}

async function loadDebtSchedule(tx: Transaction, debtId: string): Promise<DebtScheduleItemRow[]> {
  return tx
    .select()
    .from(debtScheduleItems)
    .where(eq(debtScheduleItems.debtId, debtId))
    .orderBy(asc(debtScheduleItems.position));
}
