import { Injectable } from '@nestjs/common';
import {
  customerApiErrorCode,
  debtApiErrorCode,
  debtListPageSize,
  type CreateDebtRequest,
  type DebtListQuery,
  type DebtListResponse,
  type DebtResponse,
  type ReplaceDebtRequest,
} from '@collectify/contracts';
import { and, asc, count, eq, inArray } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';

import type { AuthenticatedOwner } from '../auth';
import {
  DatabaseService,
  type Database,
} from '../database/database.service';
import { customers, debtScheduleItems, debts } from '../database/schema';
import { customerException } from '../customers/customers.errors';
import { caseInsensitiveLiteralSubstring } from '../shared/literal-search';
import { calculatePagination } from '../shared/pagination';
import { getIstanbulBusinessDate } from '../shared/istanbul-business-date';
import { getScheduleItemTiming } from './debt-timing';
import { replaceDebt as replaceDebtAggregate } from './debt-replacement';
import { debtException } from './debts.errors';

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
    const operationInstant = new Date();
    const businessDate = getIstanbulBusinessDate(operationInstant);
    const debtId = randomUUID();

    const created = await this.databaseService.db.transaction(async (tx) => {
      await this.requireOwnedCustomer(
        tx,
        currentOwner.ownerProfile.id,
        customerId,
      );

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

      const createdScheduleItems = await tx
        .insert(debtScheduleItems)
        .values(
          request.scheduleItems.map((scheduleItem, index) => ({
            id: randomUUID(),
            debtId,
            position: index + 1,
            amount: scheduleItem.amount,
            dueDate: scheduleItem.dueDate,
            createdAt: operationInstant,
            updatedAt: operationInstant,
          })),
        )
        .returning();

      return { debt: debt!, scheduleItems: createdScheduleItems };
    });

    return toDebtResponse(
      created.debt,
      created.scheduleItems,
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
    await this.requireOwnedCustomer(
      this.databaseService.db,
      currentOwner.ownerProfile.id,
      customerId,
    );

    const customerFilter = eq(debts.customerId, customerId);
    const listFilter = query.search
      ? and(
          customerFilter,
          caseInsensitiveLiteralSubstring(debts.description, query.search),
        )
      : customerFilter;
    const [{ totalItems } = { totalItems: 0 }] = await this.databaseService.db
      .select({ totalItems: count() })
      .from(debts)
      .where(listFilter);
    const { offset, ...paginationMetadata } = calculatePagination({
      page: query.page,
      pageSize: debtListPageSize,
      totalItems,
    });
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

  async replaceDebt(
    currentOwner: AuthenticatedOwner,
    customerId: string,
    debtId: string,
    request: ReplaceDebtRequest,
  ): Promise<DebtResponse> {
    const replaced = await replaceDebtAggregate(this.databaseService.db, {
      ownerProfileId: currentOwner.ownerProfile.id,
      customerId,
      debtId,
      request,
    });
    return toDebtResponse(
      replaced.debt,
      replaced.scheduleItems,
      getIstanbulBusinessDate(replaced.debt.updatedAt),
    );
  }

  async deleteDebt(
    currentOwner: AuthenticatedOwner,
    customerId: string,
    debtId: string,
  ): Promise<void> {
    await this.databaseService.db.transaction(async (tx) => {
      const ownedDebt = await this.requireOwnedDebt(
        tx,
        currentOwner.ownerProfile.id,
        customerId,
        debtId,
      );
      const deletedRows = await tx
        .delete(debts)
        .where(eq(debts.id, ownedDebt.id))
        .returning({ id: debts.id });

      if (deletedRows.length === 0) {
        throw debtException(debtApiErrorCode.debtNotFound);
      }
    });
  }

  private async requireOwnedDebt(
    executor: Pick<Database, 'select'>,
    ownerProfileId: string,
    customerId: string,
    debtId: string,
  ): Promise<DebtRow> {
    const [ownedDebt] = await executor
      .select({ debt: debts })
      .from(debts)
      .innerJoin(customers, eq(customers.id, debts.customerId))
      .where(
        and(
          eq(debts.id, debtId),
          eq(debts.customerId, customerId),
          eq(customers.ownerProfileId, ownerProfileId),
        ),
      )
      .limit(1);

    if (!ownedDebt) {
      throw debtException(debtApiErrorCode.debtNotFound);
    }

    return ownedDebt.debt;
  }

  private async requireOwnedCustomer(
    executor: Pick<Database, 'select'>,
    ownerProfileId: string,
    customerId: string,
  ): Promise<void> {
    const [customer] = await executor
      .select({ id: customers.id })
      .from(customers)
      .where(
        and(
          eq(customers.id, customerId),
          eq(customers.ownerProfileId, ownerProfileId),
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
  const responseScheduleItems = scheduleRows.map((scheduleItem) => ({
    id: scheduleItem.id,
    position: scheduleItem.position,
    amount: scheduleItem.amount,
    dueDate: scheduleItem.dueDate,
    timing: getScheduleItemTiming(scheduleItem.dueDate, businessDate),
  }));
  const debtResponseFields = {
    id: debt.id,
    customerId: debt.customerId,
    description: debt.description,
    totalAmount: debt.totalAmount,
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
      scheduleItems: [{
        ...scheduleItem,
        position: 1,
      }],
    };
  }

  return {
    ...debtResponseFields,
    paymentPlanType: 'installment',
    scheduleItems: responseScheduleItems,
  };
}
