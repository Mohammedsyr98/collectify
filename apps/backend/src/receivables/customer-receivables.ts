import { Injectable } from '@nestjs/common';
import { type Currency } from '@collectify/contracts';
import { and, eq, inArray, sql } from 'drizzle-orm';

import { DatabaseService, type Database } from '../database/database.service';
import {
  customers,
  debtScheduleItems,
  debts,
  payments,
} from '../database/schema';
import { getIstanbulBusinessDate } from '../shared/istanbul-business-date';

export type CustomerCurrencySummary = {
  currency: Currency;
  totalDebtAmount: string;
  totalPaidAmount: string;
  remainingAmount: string;
  overdueAmount: string;
};

export type SummarizeCustomersRequest = {
  ownerProfileId: string;
  customerIds: readonly string[];
  asOf: Date;
  preferredCurrency: Currency;
};

@Injectable()
export class CustomerReceivables {
  constructor(private readonly databaseService: DatabaseService) {}

  async summarizeCustomers(
    request: SummarizeCustomersRequest,
  ): Promise<ReadonlyMap<string, readonly CustomerCurrencySummary[]>> {
    const customerIds = request.customerIds;
    const summariesByCustomerId = new Map<
      string,
      CustomerCurrencySummary[]
    >(customerIds.map((customerId) => [customerId, []]));

    if (customerIds.length === 0) {
      return summariesByCustomerId;
    }

    const businessDate = getIstanbulBusinessDate(request.asOf);
    const summaryRows = await loadCustomerCurrencySummaryRows(
      this.databaseService.db,
      request.ownerProfileId,
      customerIds,
      businessDate,
    );

    for (const row of summaryRows) {
      const customerSummaries = summariesByCustomerId.get(row.customerId);

      customerSummaries?.push({
        currency: row.currency,
        totalDebtAmount: row.totalDebtAmount,
        totalPaidAmount: row.totalPaidAmount,
        remainingAmount: row.remainingAmount,
        overdueAmount: row.overdueAmount,
      });
    }

    for (const [customerId, summaries] of summariesByCustomerId) {
      summariesByCustomerId.set(
        customerId,
        sortCurrencySummaries(summaries, request.preferredCurrency),
      );
    }

    return summariesByCustomerId;
  }
}

type CustomerCurrencySummaryRow = CustomerCurrencySummary & {
  customerId: string;
};

async function loadCustomerCurrencySummaryRows(
  database: Database,
  ownerProfileId: string,
  customerIds: readonly string[],
  businessDate: string,
): Promise<CustomerCurrencySummaryRow[]> {
  const paidAmountsByScheduleItem = database
    .select({
      scheduleItemId: payments.scheduleItemId,
      paidAmount: sql<string>`cast(sum(${payments.amount}) as numeric(18, 2))`.as(
        'paid_amount',
      ),
    })
    .from(payments)
    .groupBy(payments.scheduleItemId)
    .as('paid_amounts_by_schedule_item');
  const paidAmount = sql<string>`coalesce(${paidAmountsByScheduleItem.paidAmount}, 0)`;
  const remainingAmount = sql<string>`
    ${debtScheduleItems.amount} - ${paidAmount}
  `;
  const debtBalances = database
    .select({
      debtId: debtScheduleItems.debtId,
      paidAmount: sql<string>`cast(sum(${paidAmount}) as numeric(18, 2))`.as(
        'paid_amount',
      ),
      remainingAmount: sql<string>`cast(sum(${remainingAmount}) as numeric(18, 2))`.as(
        'remaining_amount',
      ),
      overdueRemainingAmount: sql<string>`cast(sum(
        case
          when ${debtScheduleItems.dueDate} < ${businessDate}
          then ${remainingAmount}
          else 0
        end
      ) as numeric(18, 2))`.as(
        'overdue_remaining_amount',
      ),
    })
    .from(debtScheduleItems)
    .leftJoin(
      paidAmountsByScheduleItem,
      eq(paidAmountsByScheduleItem.scheduleItemId, debtScheduleItems.id),
    )
    .groupBy(debtScheduleItems.debtId)
    .as('debt_balances');

  return database
    .select({
      customerId: debts.customerId,
      currency: debts.currency,
      totalDebtAmount: sql<string>`cast(sum(${debts.totalAmount}) as numeric(18, 2))`,
      totalPaidAmount: sql<string>`cast(coalesce(sum(${debtBalances.paidAmount}), 0) as numeric(18, 2))`,
      remainingAmount: sql<string>`cast(coalesce(
        sum(${debtBalances.remainingAmount}),
        sum(${debts.totalAmount})
      ) as numeric(18, 2))`,
      overdueAmount: sql<string>`cast(coalesce(sum(${debtBalances.overdueRemainingAmount}), 0) as numeric(18, 2))`,
    })
    .from(debts)
    .innerJoin(customers, eq(customers.id, debts.customerId))
    .leftJoin(
      debtBalances,
      eq(debtBalances.debtId, debts.id),
    )
    .where(
      and(
        eq(customers.ownerProfileId, ownerProfileId),
        inArray(debts.customerId, customerIds),
      ),
    )
    .groupBy(debts.customerId, debts.currency);
}

function sortCurrencySummaries(
  summaries: readonly CustomerCurrencySummary[],
  preferredCurrency: Currency,
): CustomerCurrencySummary[] {
  return [...summaries].sort(
    (left, right) =>
      Number(right.currency === preferredCurrency) -
        Number(left.currency === preferredCurrency) ||
      left.currency.localeCompare(right.currency),
  );
}
