import { Injectable } from '@nestjs/common';
import {
  customerApiErrorCode,
  debtListPageSize,
  type CreateDebtRequest,
  type DebtListQuery,
  type DebtListResponse,
  type DebtResponse,
} from '@collectify/contracts';
import { and, asc, count, eq, inArray, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';

import type { AuthenticatedOwner } from '../auth';
import { DatabaseService } from '../database/database.service';
import { customers, debtScheduleItems, debts } from '../database/schema';
import { customerException } from '../customers/customers.errors';
import { calculatePagination } from '../shared/pagination';
import {
  getIstanbulBusinessDate,
  getScheduleItemTiming,
} from './debt-timing';

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

    const operationInstant = new Date();
    const businessDate = getIstanbulBusinessDate(operationInstant);
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
          createdAt: operationInstant,
          updatedAt: operationInstant,
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
          createdAt: operationInstant,
          updatedAt: operationInstant,
        })
        .returning();

      return { debt: debt!, scheduleItem: scheduleItem! };
    });

    return toDebtResponse(
      created.debt,
      [created.scheduleItem],
      businessDate,
    );
  }

  async listDebts(
    currentOwner: AuthenticatedOwner,
    customerId: string,
    query: DebtListQuery,
  ): Promise<DebtListResponse> {
    const operationInstant = new Date();
    const businessDate = getIstanbulBusinessDate(operationInstant);
    await this.requireOwnedCustomer(currentOwner, customerId);

    const listFilter = eq(debts.customerId, customerId);
    const [{ totalItems } = { totalItems: 0 }] = await this.databaseService.db
      .select({ totalItems: count() })
      .from(debts)
      .where(listFilter);
    const { offset, ...paginationMetadata } = calculatePagination({
      page: query.page,
      pageSize: debtListPageSize,
      totalItems,
    });
    const timingPriority = sql<number>`
      CASE
        WHEN ${debtScheduleItems.dueDate} < ${businessDate} THEN 0
        WHEN ${debtScheduleItems.dueDate} = ${businessDate} THEN 1
        ELSE 2
      END
    `;
    const debtRows = await this.databaseService.db
      .select({ debt: debts })
      .from(debts)
      .innerJoin(
        debtScheduleItems,
        and(
          eq(debtScheduleItems.debtId, debts.id),
          eq(debtScheduleItems.position, 1),
        ),
      )
      .where(listFilter)
      .orderBy(
        asc(timingPriority),
        asc(debtScheduleItems.dueDate),
        asc(debts.createdAt),
        asc(debts.id),
      )
      .limit(paginationMetadata.pageSize)
      .offset(offset);
    const selectedDebts = debtRows.map(({ debt }) => debt);
    const scheduleRows = debtRows.length
      ? await this.databaseService.db
          .select()
          .from(debtScheduleItems)
          .where(
            inArray(
              debtScheduleItems.debtId,
              selectedDebts.map((debt) => debt.id),
            ),
          )
          .orderBy(asc(debtScheduleItems.position))
      : [];
    const scheduleItemsByDebtId = groupScheduleItemsByDebtId(scheduleRows);

    return {
      items: selectedDebts.map((debt) =>
        toDebtResponse(
          debt,
          scheduleItemsByDebtId.get(debt.id) ?? [],
          businessDate,
        ),
      ),
      ...paginationMetadata,
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
  businessDate: string,
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
      timing: getScheduleItemTiming(scheduleItem.dueDate, businessDate),
    })) as DebtResponse['scheduleItems'],
    createdAt: debt.createdAt.toISOString(),
    updatedAt: debt.updatedAt.toISOString(),
  };
}
