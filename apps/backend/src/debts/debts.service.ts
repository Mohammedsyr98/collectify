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
import { and, asc, count, eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';

import type { AuthenticatedOwner } from '../auth';
import { DatabaseService, type Database } from '../database/database.service';
import { customers, debtScheduleItems, debts } from '../database/schema';
import { customerException } from '../customers/customers.errors';
import { caseInsensitiveLiteralSubstring } from '../shared/literal-search';
import { calculatePagination } from '../shared/pagination';
import { getIstanbulBusinessDate } from '../shared/istanbul-business-date';
import { loadPaymentAmountsByScheduleItemId } from '../payments/schedule-item-payment-amounts';
import { checkDebtPaymentHistoryChange } from './debt-payment-history';
import { loadDebtsWithPaymentDetails } from './debt-read-model';
import { replaceDebt as replaceDebtInDatabase } from './debt-replacement';
import { debtException } from './debts.errors';

type DebtRow = typeof debts.$inferSelect;
type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];

type DebtPageItem = {
  debt: DebtRow;
};

type DebtPage = {
  items: DebtPageItem[];
  page: number;
  pageSize: typeof debtListPageSize;
  totalItems: number;
  totalPages: number;
};

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

    return this.databaseService.db.transaction(async (tx) => {
      await this.requireOwnedCustomer(tx, currentOwner.ownerProfile.id, customerId);

      const createdDebt = await insertDebtAndScheduleItems(tx, {
        debtId,
        customerId,
        request,
        operationInstant,
      });

      const [response] = await loadDebtsWithPaymentDetails(tx, [createdDebt], businessDate);
      return response!;
    });
  }

  async listDebts(
    currentOwner: AuthenticatedOwner,
    customerId: string,
    query: DebtListQuery,
  ): Promise<DebtListResponse> {
    const operationInstant = new Date();
    const businessDate = getIstanbulBusinessDate(operationInstant);

    return this.databaseService.db.transaction(
      async (tx) => {
        await this.requireOwnedCustomer(tx, currentOwner.ownerProfile.id, customerId);

        const page = await loadDebtPage(tx, customerId, query);
        const responses = await loadDebtsWithPaymentDetails(
          tx,
          page.items.map(({ debt }) => debt),
          businessDate,
        );

        return {
          items: responses,
          page: page.page,
          pageSize: page.pageSize,
          totalItems: page.totalItems,
          totalPages: page.totalPages,
        };
      },
      {
        isolationLevel: 'repeatable read',
        accessMode: 'read only',
      },
    );
  }

  async replaceDebt(
    currentOwner: AuthenticatedOwner,
    customerId: string,
    debtId: string,
    request: ReplaceDebtRequest,
  ): Promise<DebtResponse> {
    return this.databaseService.db.transaction(async (tx) => {
      const replacedDebt = await replaceDebtInDatabase(tx, {
        ownerProfileId: currentOwner.ownerProfile.id,
        customerId,
        debtId,
        request,
      });

      const [response] = await loadDebtsWithPaymentDetails(
        tx,
        [replacedDebt.debt],
        getIstanbulBusinessDate(replacedDebt.debt.updatedAt),
      );
      return response!;
    });
  }

  async deleteDebt(
    currentOwner: AuthenticatedOwner,
    customerId: string,
    debtId: string,
  ): Promise<void> {
    await this.databaseService.db.transaction(async (tx) => {
      const ownedDebt = await this.requireOwnedDebtForUpdate(
        tx,
        currentOwner.ownerProfile.id,
        customerId,
        debtId,
      );
      const scheduleItems = await tx
        .select({ id: debtScheduleItems.id })
        .from(debtScheduleItems)
        .where(eq(debtScheduleItems.debtId, ownedDebt.id))
        .orderBy(asc(debtScheduleItems.id))
        .for('update');
      const paymentAmountsByScheduleItemId = await loadPaymentAmountsByScheduleItemId(
        tx,
        scheduleItems.map(({ id }) => id),
      );
      const conflict = checkDebtPaymentHistoryChange({
        currentDebt: ownedDebt,
        currentScheduleItems: scheduleItems,
        paymentAmountsByScheduleItemId,
        change: { kind: 'delete' },
      });

      if (conflict) {
        throw debtException(conflict);
      }

      const deletedRows = await tx
        .delete(debts)
        .where(eq(debts.id, ownedDebt.id))
        .returning({ id: debts.id });

      if (deletedRows.length === 0) {
        throw debtException(debtApiErrorCode.debtNotFound);
      }
    });
  }

  private async requireOwnedDebtForUpdate(
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
      .limit(1)
      .for('update', { of: debts });

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
      .where(and(eq(customers.id, customerId), eq(customers.ownerProfileId, ownerProfileId)))
      .limit(1);

    if (!customer) {
      throw customerException(customerApiErrorCode.customerNotFound);
    }
  }
}

async function insertDebtAndScheduleItems(
  tx: Transaction,
  {
    debtId,
    customerId,
    request,
    operationInstant,
  }: {
    debtId: string;
    customerId: string;
    request: CreateDebtRequest;
    operationInstant: Date;
  },
): Promise<DebtRow> {
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

  await tx
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
    );

  return debt!;
}

async function loadDebtPage(
  tx: Transaction,
  customerId: string,
  query: DebtListQuery,
): Promise<DebtPage> {
  const customerFilter = eq(debts.customerId, customerId);
  const listFilter = query.search
    ? and(customerFilter, caseInsensitiveLiteralSubstring(debts.description, query.search))
    : customerFilter;
  const [{ totalItems } = { totalItems: 0 }] = await tx
    .select({ totalItems: count() })
    .from(debts)
    .where(listFilter);
  const { offset, ...pagination } = calculatePagination({
    page: query.page,
    pageSize: debtListPageSize,
    totalItems,
  });
  const debtRows = await tx
    .select({ debt: debts })
    .from(debts)
    .innerJoin(
      debtScheduleItems,
      and(eq(debtScheduleItems.debtId, debts.id), eq(debtScheduleItems.position, 1)),
    )
    .where(listFilter)
    .orderBy(asc(debtScheduleItems.dueDate), asc(debts.createdAt), asc(debts.id))
    .limit(pagination.pageSize)
    .offset(offset);
  const selectedDebts = debtRows.map(({ debt }) => debt);
  return {
    items: selectedDebts.map((debt) => ({ debt })),
    ...pagination,
  };
}
