import { Injectable } from '@nestjs/common';
import {
  paymentApiErrorCode,
  paymentTargetPageSize,
  type PaymentTarget,
  type PaymentTargetListResponse,
  type PaymentTargetQuery,
} from '@collectify/contracts';
import { and, asc, count, eq, sql, type SQL } from 'drizzle-orm';

import type { AuthenticatedOwner } from '../auth';
import { DatabaseService, type Database } from '../database/database.service';
import { customers, debtScheduleItems, debts, payments } from '../database/schema';
import { requireOwnedCustomer } from '../customers';
import { createScheduleItemPaymentSummary, getPaymentState } from '../receivables';
import { caseInsensitiveLiteralSubstring } from '../shared/literal-search';
import { calculatePagination } from '../shared/pagination';
import { getIstanbulBusinessDate } from '../shared/istanbul-business-date';
import { getScheduleItemTiming } from '../debts';
import { paymentException } from './payments.errors';

type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];

type PaymentTargetRow = {
  scheduleItemId: string;
  debtId: string;
  debtDescription: string;
  currency: 'TRY' | 'USD' | 'EUR';
  debtVersion: number;
  amount: string;
  paidAmount: string;
  availableToPayAmount: string;
  dueDate: string;
  position: number;
  hasOtherScheduleItems: boolean;
};

type EditingPayment = {
  scheduleItemId: string;
  amount: string;
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
        await requireOwnedCustomer(tx, {
          ownerProfileId: currentOwner.ownerProfile.id,
          customerId,
        });

        const editingPayment = query.editingPaymentId
          ? await findOwnedEditingPayment(tx, {
              ownerProfileId: currentOwner.ownerProfile.id,
              customerId,
              paymentId: query.editingPaymentId,
            })
          : null;

        if (query.editingPaymentId && !editingPayment) {
          throw paymentException(paymentApiErrorCode.paymentNotFound);
        }

        const page = await loadPaymentTargetPage(tx, customerId, query, editingPayment);

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

async function loadPaymentTargetPage(
  tx: Transaction,
  customerId: string,
  query: PaymentTargetQuery,
  editingPayment: EditingPayment | null,
): Promise<{
  items: PaymentTargetRow[];
  page: number;
  pageSize: typeof paymentTargetPageSize;
  totalItems: number;
  totalPages: number;
}> {
  const targetPaymentSummary = createScheduleItemPaymentSummary(tx);
  const paidAmount = buildAdjustedPaidAmount(targetPaymentSummary.paidAmount, editingPayment);
  const availableToPayAmount = buildAdjustedAvailableAmount(
    targetPaymentSummary.remainingAmount,
    editingPayment,
  );
  const targetFilter = buildPaymentTargetFilter({
    customerId,
    query,
    paidAmount,
    availableToPayAmount,
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
      paidAmount,
      availableToPayAmount,
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
  paidAmount: SQL<string>;
  availableToPayAmount: SQL<string>;
}) {
  const filters = [
    eq(debts.customerId, input.customerId),
    sql`${input.availableToPayAmount} > 0`,
  ];

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

function buildAdjustedPaidAmount(
  paidAmount: SQL<string>,
  editingPayment: EditingPayment | null,
): SQL<string> {
  if (!editingPayment) return paidAmount;

  return sql<string>`cast(greatest(
    ${paidAmount} - case
      when ${debtScheduleItems.id} = ${editingPayment.scheduleItemId}
        then ${editingPayment.amount}::numeric
      else 0
    end,
    0
  ) as numeric(18, 2))`;
}

function buildAdjustedAvailableAmount(
  remainingAmount: SQL<string>,
  editingPayment: EditingPayment | null,
): SQL<string> {
  if (!editingPayment) return remainingAmount;

  return sql<string>`cast(
    ${remainingAmount} + case
      when ${debtScheduleItems.id} = ${editingPayment.scheduleItemId}
        then ${editingPayment.amount}::numeric
      else 0
    end
    as numeric(18, 2)
  )`;
}

async function findOwnedEditingPayment(
  tx: Transaction,
  input: {
    ownerProfileId: string;
    customerId: string;
    paymentId: string;
  },
): Promise<EditingPayment | null> {
  const [row] = await tx
    .select({
      scheduleItemId: payments.scheduleItemId,
      amount: payments.amount,
    })
    .from(payments)
    .innerJoin(debtScheduleItems, eq(debtScheduleItems.id, payments.scheduleItemId))
    .innerJoin(debts, eq(debts.id, debtScheduleItems.debtId))
    .innerJoin(customers, eq(customers.id, debts.customerId))
    .where(
      and(
        eq(payments.id, input.paymentId),
        eq(debts.customerId, input.customerId),
        eq(customers.ownerProfileId, input.ownerProfileId),
      ),
    )
    .limit(1);

  return row ?? null;
}

function buildPaymentTargetListItem(row: PaymentTargetRow, businessDate: string): PaymentTarget {
  const paymentState = getPaymentState(row.paidAmount, row.availableToPayAmount);

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
    availableToPayAmount: row.availableToPayAmount,
    dueDate: row.dueDate,
    timing: getScheduleItemTiming(row.dueDate, businessDate),
    paymentState,
    plan: row.hasOtherScheduleItems
      ? { type: 'installment', position: row.position }
      : { type: 'onePayment' },
  };
}
