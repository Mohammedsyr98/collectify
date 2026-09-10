import { Injectable } from '@nestjs/common';
import {
  customerApiErrorCode,
  debtListPageSize,
  type CreateDebtRequest,
  type DebtListResponse,
  type DebtResponse,
} from '@collectify/contracts';
import { and, asc, count, desc, eq, inArray } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';

import type { AuthenticatedOwner } from '../auth';
import { DatabaseService } from '../database/database.service';
import { customers, debtScheduleItems, debts } from '../database/schema';
import { customerException } from '../customers/customers.errors';

type DebtRow = typeof debts.$inferSelect;
type DebtScheduleItemRow = typeof debtScheduleItems.$inferSelect;

@Injectable()
export class DebtsService {
  constructor(private readonly databaseService: DatabaseService) {}

  async createDebt(
    currentOwner: AuthenticatedOwner,
    customerId: string,
    request: CreateDebtRequest,
  ): Promise<DebtResponse> {
    await this.requireOwnedCustomer(currentOwner, customerId);

    const now = new Date();
    const debtId = randomUUID();
    const scheduleItemId = randomUUID();

    const created = await this.databaseService.db.transaction(async (tx) => {
      const [debt] = await tx
        .insert(debts)
        .values({
          id: debtId,
          customerId,
          description: request.description,
          totalAmount: request.totalAmount,
          currency: request.currency,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      const [scheduleItem] = await tx
        .insert(debtScheduleItems)
        .values({
          id: scheduleItemId,
          debtId,
          position: 1,
          amount: request.totalAmount,
          dueDate: request.paymentPlan.dueDate,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      return { debt: debt!, scheduleItem: scheduleItem! };
    });

    return toDebtResponse(created.debt, [created.scheduleItem]);
  }

  async listDebts(
    currentOwner: AuthenticatedOwner,
    customerId: string,
  ): Promise<DebtListResponse> {
    await this.requireOwnedCustomer(currentOwner, customerId);

    const listFilter = eq(debts.customerId, customerId);
    const [{ totalItems } = { totalItems: 0 }] = await this.databaseService.db
      .select({ totalItems: count() })
      .from(debts)
      .where(listFilter);
    const debtRows = await this.databaseService.db
      .select()
      .from(debts)
      .where(listFilter)
      .orderBy(desc(debts.createdAt), desc(debts.id))
      .limit(debtListPageSize);
    const scheduleRows = debtRows.length
      ? await this.databaseService.db
          .select()
          .from(debtScheduleItems)
          .where(
            inArray(
              debtScheduleItems.debtId,
              debtRows.map((debt) => debt.id),
            ),
          )
          .orderBy(asc(debtScheduleItems.position))
      : [];
    const scheduleItemsByDebtId = groupScheduleItemsByDebtId(scheduleRows);

    return {
      items: debtRows.map((debt) =>
        toDebtResponse(debt, scheduleItemsByDebtId.get(debt.id) ?? []),
      ),
      page: 1,
      pageSize: debtListPageSize,
      totalItems,
      totalPages: Math.ceil(totalItems / debtListPageSize),
    };
  }

  private async requireOwnedCustomer(
    currentOwner: AuthenticatedOwner,
    customerId: string,
  ): Promise<void> {
    const [customer] = await this.databaseService.db
      .select({ id: customers.id })
      .from(customers)
      .where(
        and(
          eq(customers.id, customerId),
          eq(customers.ownerProfileId, currentOwner.ownerProfile.id),
        ),
      )
      .limit(1);

    if (!customer) {
      throw customerException(customerApiErrorCode.customerNotFound);
    }
  }
}

function groupScheduleItemsByDebtId(
  scheduleRows: DebtScheduleItemRow[],
): Map<string, DebtScheduleItemRow[]> {
  const scheduleItemsByDebtId = new Map<string, DebtScheduleItemRow[]>();

  for (const scheduleItem of scheduleRows) {
    const debtScheduleItems = scheduleItemsByDebtId.get(scheduleItem.debtId) ?? [];
    debtScheduleItems.push(scheduleItem);
    scheduleItemsByDebtId.set(scheduleItem.debtId, debtScheduleItems);
  }

  return scheduleItemsByDebtId;
}

function toDebtResponse(
  debt: DebtRow,
  scheduleRows: DebtScheduleItemRow[],
): DebtResponse {
  return {
    id: debt.id,
    customerId: debt.customerId,
    description: debt.description,
    totalAmount: debt.totalAmount,
    currency: debt.currency,
    paymentPlanType: 'onePayment',
    scheduleItems: scheduleRows.map((scheduleItem) => ({
      id: scheduleItem.id,
      position: scheduleItem.position as 1,
      amount: scheduleItem.amount,
      dueDate: scheduleItem.dueDate,
    })) as DebtResponse['scheduleItems'],
    createdAt: debt.createdAt.toISOString(),
    updatedAt: debt.updatedAt.toISOString(),
  };
}
