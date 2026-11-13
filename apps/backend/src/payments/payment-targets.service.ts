import { Injectable } from '@nestjs/common';
import {
  customerApiErrorCode,
  paymentTargetPageSize,
  type PaymentTarget,
  type PaymentTargetListResponse,
  type PaymentTargetQuery,
} from '@collectify/contracts';
import { and, asc, count, eq, sql, type SQLWrapper } from 'drizzle-orm';

import type { AuthenticatedOwner } from '../auth';
import { DatabaseService, type Database } from '../database/database.service';
import { customers, debtScheduleItems, debts } from '../database/schema';
import { customerException } from '../customers';
import { createScheduleItemPaymentSummary, getPaymentState } from '../receivables';
import { caseInsensitiveLiteralSubstring } from '../shared/literal-search';
import { calculatePagination } from '../shared/pagination';
import { getIstanbulBusinessDate } from '../shared/istanbul-business-date';
import { getScheduleItemTiming } from '../debts';

type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];

type PaymentTargetRow = {
  scheduleItemId: string;
  debtId: string;
  debtDescription: string;
  currency: 'TRY' | 'USD' | 'EUR';
  debtVersion: number;
  amount: string;
  paidAmount: string;
  remainingAmount: string;
  dueDate: string;
  position: number;
  hasOtherScheduleItems: boolean;
};

@Injectable()
export class PaymentTargetsService {
  constructor(private readonly databaseService: DatabaseService) {}

  async listPaymentTargets(
    currentOwner: AuthenticatedOwner,
    customerId: string,
    query: PaymentTargetQuery,
  ): Promise<PaymentTargetListResponse> {
    const businessDate = getIstanbulBusinessDate(new Date());

    return this.databaseService.db.transaction(
      async (tx) => {
        await requireOwnedCustomer(tx, currentOwner.ownerProfile.id, customerId);

        const page = await loadPaymentTargetPage(tx, customerId, query);

        return {
          items: page.items.map((item) => buildPaymentTargetListItem(item, businessDate)),
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
}

async function requireOwnedCustomer(
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

async function loadPaymentTargetPage(
  tx: Transaction,
  customerId: string,
  query: PaymentTargetQuery,
): Promise<{
  items: PaymentTargetRow[];
  page: number;
  pageSize: typeof paymentTargetPageSize;
  totalItems: number;
  totalPages: number;
}> {
  const targetPaymentSummary = createScheduleItemPaymentSummary(tx);
  const targetFilter = buildPaymentTargetFilter({
    customerId,
    query,
    paidAmount: targetPaymentSummary.paidAmount,
    remainingAmount: targetPaymentSummary.remainingAmount,
  });

  const [{ totalItems } = { totalItems: 0 }] = await tx
    .select({ totalItems: count() })
    .from(debtScheduleItems)
    .innerJoin(debts, eq(debts.id, debtScheduleItems.debtId))
    .leftJoin(
      targetPaymentSummary.paymentTotalsByScheduleItem,
      eq(targetPaymentSummary.paymentTotalsByScheduleItem.scheduleItemId, debtScheduleItems.id),
    )
    .where(targetFilter);

  const pagination = calculatePagination({
    page: query.page,
    pageSize: paymentTargetPageSize,
    totalItems,
  });

  const rows = await tx
    .select({
      scheduleItemId: debtScheduleItems.id,
      debtId: debts.id,
      debtDescription: debts.description,
      currency: debts.currency,
      debtVersion: debts.version,
      amount: debtScheduleItems.amount,
      paidAmount: targetPaymentSummary.paidAmount,
      remainingAmount: targetPaymentSummary.remainingAmount,
      dueDate: debtScheduleItems.dueDate,
      position: debtScheduleItems.position,
      hasOtherScheduleItems: sql<boolean>`exists (
        select 1
        from debt_schedule_items as other_schedule_item
        where other_schedule_item.debt_id = ${debtScheduleItems.debtId}
          and other_schedule_item.id <> ${debtScheduleItems.id}
      )`,
    })
    .from(debtScheduleItems)
    .innerJoin(debts, eq(debts.id, debtScheduleItems.debtId))
    .leftJoin(
      targetPaymentSummary.paymentTotalsByScheduleItem,
      eq(targetPaymentSummary.paymentTotalsByScheduleItem.scheduleItemId, debtScheduleItems.id),
    )
    .where(targetFilter)
    .orderBy(
      asc(debtScheduleItems.dueDate),
      asc(debts.createdAt),
      asc(debts.id),
      asc(debtScheduleItems.position),
      asc(debtScheduleItems.id),
    )
    .limit(pagination.pageSize)
    .offset(pagination.offset);

  return {
    items: rows,
    ...pagination,
  };
}

function buildPaymentTargetFilter(input: {
  customerId: string;
  query: PaymentTargetQuery;
  paidAmount: SQLWrapper;
  remainingAmount: SQLWrapper;
}) {
  const filters = [eq(debts.customerId, input.customerId), sql`${input.remainingAmount} > 0`];

  if (input.query.search) {
    filters.push(caseInsensitiveLiteralSubstring(debts.description, input.query.search));
  }

  if (input.query.paymentState === 'unpaid') {
    filters.push(sql`${input.paidAmount} = 0`);
  }

  if (input.query.paymentState === 'partiallyPaid') {
    filters.push(sql`${input.paidAmount} > 0`);
  }

  return and(...filters);
}

function buildPaymentTargetListItem(row: PaymentTargetRow, businessDate: string): PaymentTarget {
  const paymentState = getPaymentState(row.paidAmount, row.remainingAmount);

  if (paymentState === 'paid') {
    throw new Error(`Paid payment target returned: ${row.scheduleItemId}`);
  }

  return {
    scheduleItemId: row.scheduleItemId,
    debtId: row.debtId,
    debtDescription: row.debtDescription,
    currency: row.currency,
    debtVersion: row.debtVersion,
    amount: row.amount,
    remainingAmount: row.remainingAmount,
    dueDate: row.dueDate,
    timing: getScheduleItemTiming(row.dueDate, businessDate),
    paymentState,
    plan: row.hasOtherScheduleItems
      ? { type: 'installment', position: row.position }
      : { type: 'onePayment' },
  };
}
