import { Injectable } from '@nestjs/common';
import { type Currency } from '@collectify/contracts';
import { and, eq, inArray, sql } from 'drizzle-orm';

import { DatabaseService } from '../database/database.service';
import {
  customers,
  debtScheduleItems,
  debts,
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
    const overdueByDebt = this.databaseService.db.$with('overdue_by_debt').as(
      this.databaseService.db
        .select({
          debtId: debtScheduleItems.debtId,
          overdueAmount:
            sql<string>`cast(sum(${debtScheduleItems.amount}) as numeric(18, 2))`.as(
              'overdue_amount',
            ),
        })
        .from(debtScheduleItems)
        .where(sql`${debtScheduleItems.dueDate} < ${businessDate}`)
        .groupBy(debtScheduleItems.debtId),
    );
    const summaryRows = await this.databaseService.db
      .with(overdueByDebt)
      .select({
        customerId: debts.customerId,
        currency: debts.currency,
        totalDebtAmount: sql<string>`cast(sum(${debts.totalAmount}) as numeric(18, 2))`,
        overdueAmount: sql<string>`cast(coalesce(sum(${overdueByDebt.overdueAmount}), 0) as numeric(18, 2))`,
      })
      .from(debts)
      .innerJoin(customers, eq(customers.id, debts.customerId))
      .leftJoin(overdueByDebt, eq(overdueByDebt.debtId, debts.id))
      .where(
        and(
          eq(customers.ownerProfileId, request.ownerProfileId),
          inArray(debts.customerId, customerIds),
        ),
      )
      .groupBy(debts.customerId, debts.currency);

    for (const row of summaryRows) {
      const customerSummaries = summariesByCustomerId.get(row.customerId);

      customerSummaries?.push({
        currency: row.currency,
        totalDebtAmount: row.totalDebtAmount,
        totalPaidAmount: '0.00',
        remainingAmount: row.totalDebtAmount,
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
