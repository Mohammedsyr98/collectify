import { Injectable } from '@nestjs/common';
import {
  customerApiErrorCode,
  customerListPageSize,
  type Currency,
  type CreateCustomerRequest,
  type CustomerDetailsResponse,
  type CustomerListQuery,
  type CustomerListItem,
  type CustomerListResponse,
  type UpdateCustomerRequest,
  type UpdateCustomerResponse,
} from '@collectify/contracts';
import { and, desc, eq, inArray, or, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';

import type { AuthenticatedOwner } from '../auth';
import { DatabaseService } from '../database/database.service';
import {
  customerConstraints,
  customers,
  debtScheduleItems,
  debts,
} from '../database/schema';
import { getIstanbulBusinessDate } from '../debts/debt-timing';
import { calculatePagination } from '../shared/pagination';
import { customerException } from './customers.errors';

type CustomerRow = typeof customers.$inferSelect;
type DebtFinancialAggregate = {
  customerId: string;
  currency: Currency;
  totalDebtAmount: string;
  overdueAmount: string;
};
type DebtOverdueRow = {
  customerId: string;
  currency: Currency;
  overdueAmount: string;
};
type SearchableCustomerColumn =
  | typeof customers.name
  | typeof customers.code
  | typeof customers.phoneNumber;

@Injectable()
export class CustomersService {
  constructor(private readonly databaseService: DatabaseService) {}

  async createCustomer(
    currentOwner: AuthenticatedOwner,
    request: CreateCustomerRequest,
  ): Promise<CustomerDetailsResponse> {
    const now = new Date();

    try {
      const [customer] = await this.databaseService.db
        .insert(customers)
        .values({
          id: randomUUID(),
          ownerProfileId: currentOwner.ownerProfile.id,
          name: request.name,
          code: request.code,
          phoneNumber: request.phoneNumber,
          address: request.address ?? null,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      return toCustomerDetailsResponse(customer, []);
    } catch (error) {
      if (isCustomerCodeUniqueViolation(error)) {
        throw customerException(customerApiErrorCode.customerCodeAlreadyExists);
      }

      throw error;
    }
  }

  async getCustomerById(
    currentOwner: AuthenticatedOwner,
    customerId: string,
  ): Promise<CustomerDetailsResponse> {
    const [customer] = await this.databaseService.db
      .select()
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

    const financialSummary = await this.getFinancialSummary(
      customer.id,
      currentOwner.ownerProfile.defaultCurrency,
    );

    return toCustomerDetailsResponse(customer, financialSummary);
  }

  async updateCustomer(
    currentOwner: AuthenticatedOwner,
    customerId: string,
    request: UpdateCustomerRequest,
  ): Promise<UpdateCustomerResponse> {
    const updateValues: Partial<typeof customers.$inferInsert> = {
      ...request,
      updatedAt: new Date(),
    };

    try {
      const [customer] = await this.databaseService.db
        .update(customers)
        .set(updateValues)
        .where(
          and(
            eq(customers.id, customerId),
            eq(customers.ownerProfileId, currentOwner.ownerProfile.id),
          ),
        )
        .returning();

      if (!customer) {
        throw customerException(customerApiErrorCode.customerNotFound);
      }

      const financialSummary = await this.getFinancialSummary(
        customer.id,
        currentOwner.ownerProfile.defaultCurrency,
      );

      return toCustomerDetailsResponse(customer, financialSummary);
    } catch (error) {
      if (isCustomerCodeUniqueViolation(error)) {
        throw customerException(customerApiErrorCode.customerCodeAlreadyExists);
      }

      throw error;
    }
  }

  async listCustomers(
    currentOwner: AuthenticatedOwner,
    query: CustomerListQuery,
  ): Promise<CustomerListResponse> {
    const ownerProfileId = currentOwner.ownerProfile.id;
    const listFilter = customerListFilter(ownerProfileId, query.search);
    const [{ totalItems } = { totalItems: 0 }] = await this.databaseService.db
      .select({ totalItems: sql<number>`count(*)::int` })
      .from(customers)
      .where(listFilter);
    const { offset, ...paginationMetadata } = calculatePagination({
      page: query.page,
      pageSize: customerListPageSize,
      totalItems,
    });
    const customerRows = await this.databaseService.db
      .select()
      .from(customers)
      .where(listFilter)
      .orderBy(desc(customers.createdAt), desc(customers.id))
      .limit(paginationMetadata.pageSize)
      .offset(offset);
    const operationInstant = new Date();
    const debtFinancialAggregates = await this.getDebtFinancialAggregates(
      customerRows.map((customer) => customer.id),
      getIstanbulBusinessDate(operationInstant),
    );
    const aggregatesByCustomerId = groupDebtFinancialAggregatesByCustomerId(
      debtFinancialAggregates,
    );

    return {
      items: customerRows.map((customer) =>
        toCustomerListItemResponse(
          customer,
          aggregatesByCustomerId.get(customer.id) ?? [],
          currentOwner.ownerProfile.defaultCurrency,
        ),
      ),
      ...paginationMetadata,
    };
  }

  private async getFinancialSummary(
    customerId: string,
    defaultCurrency: Currency,
  ) {
    const aggregates = await this.getDebtFinancialAggregates(
      [customerId],
      getIstanbulBusinessDate(new Date()),
    );

    return sortDebtFinancialAggregates(aggregates, defaultCurrency).map(
      (aggregate) => ({
      currency: aggregate.currency,
      totalDebtAmount: aggregate.totalDebtAmount,
      totalPaidAmount: '0.00',
      remainingAmount: aggregate.totalDebtAmount,
      }),
    );
  }

  private async getDebtFinancialAggregates(
    customerIds: string[],
    businessDate: string,
  ): Promise<DebtFinancialAggregate[]> {
    if (customerIds.length === 0) {
      return [];
    }

    const rows = await this.databaseService.db
      .select({
        customerId: debts.customerId,
        currency: debts.currency,
        totalDebtAmount: sql<string>`cast(sum(${debts.totalAmount}) as numeric(18, 2))`,
      })
      .from(debts)
      .where(inArray(debts.customerId, customerIds))
      .groupBy(debts.customerId, debts.currency);

    if (rows.length === 0) {
      return [];
    }

    const overdueRows = await this.databaseService.db
      .select({
        customerId: debts.customerId,
        currency: debts.currency,
        overdueAmount: sql<string>`cast(sum(${debtScheduleItems.amount}) as numeric(18, 2))`,
      })
      .from(debtScheduleItems)
      .innerJoin(debts, eq(debts.id, debtScheduleItems.debtId))
      .where(
        and(
          inArray(debts.customerId, customerIds),
          sql`${debtScheduleItems.dueDate} < ${businessDate}`,
        ),
      )
      .groupBy(debts.customerId, debts.currency);
    const overdueByKey = new Map(
      (overdueRows as DebtOverdueRow[]).map((row) => [
        financialAggregateKey(row.customerId, row.currency),
        row.overdueAmount,
      ]),
    );

    return (rows as Omit<DebtFinancialAggregate, 'overdueAmount'>[]).map(
      (row) => ({
        ...row,
        overdueAmount:
          overdueByKey.get(financialAggregateKey(row.customerId, row.currency)) ??
          '0.00',
      }),
    );
  }
}

function customerListFilter(ownerProfileId: string, search: string | undefined) {
  const ownerFilter = eq(customers.ownerProfileId, ownerProfileId);

  if (!search) {
    return ownerFilter;
  }

  return and(
    ownerFilter,
    or(
      caseInsensitiveLiteralSubstring(customers.name, search),
      caseInsensitiveLiteralSubstring(customers.code, search),
      caseInsensitiveLiteralSubstring(customers.phoneNumber, search),
    ),
  );
}

function caseInsensitiveLiteralSubstring(
  column: SearchableCustomerColumn,
  search: string,
) {
  return sql`lower(${column}) like ${`%${escapeLikePattern(search.toLowerCase())}%`} escape '\\'`;
}

function escapeLikePattern(value: string): string {
  return value.replaceAll('\\', '\\\\').replaceAll('%', '\\%').replaceAll('_', '\\_');
}

function toCustomerDetailsResponse(
  customer: CustomerRow,
  financialSummary: CustomerDetailsResponse['financialSummary'],
): CustomerDetailsResponse {
  return {
    id: customer.id,
    name: customer.name,
    code: customer.code,
    phoneNumber: customer.phoneNumber,
    address: customer.address,
    createdAt: customer.createdAt.toISOString(),
    updatedAt: customer.updatedAt.toISOString(),
    financialSummary,
  };
}

function toCustomerListItemResponse(
  customer: CustomerRow,
  aggregates: DebtFinancialAggregate[],
  defaultCurrency: Currency,
): CustomerListItem {
  return {
    id: customer.id,
    name: customer.name,
    code: customer.code,
    phoneNumber: customer.phoneNumber,
    createdAt: customer.createdAt.toISOString(),
    updatedAt: customer.updatedAt.toISOString(),
    financialSummary: {
      balancesByCurrency: sortDebtFinancialAggregates(
        aggregates,
        defaultCurrency,
      ).map((aggregate) => ({
        currency: aggregate.currency,
        remainingAmount: aggregate.totalDebtAmount,
        overdueAmount: aggregate.overdueAmount,
      })),
    },
  };
}

function groupDebtFinancialAggregatesByCustomerId(
  aggregates: DebtFinancialAggregate[],
): Map<string, DebtFinancialAggregate[]> {
  const aggregatesByCustomerId = new Map<string, DebtFinancialAggregate[]>();

  for (const aggregate of aggregates) {
    const customerAggregates =
      aggregatesByCustomerId.get(aggregate.customerId) ?? [];
    customerAggregates.push(aggregate);
    aggregatesByCustomerId.set(aggregate.customerId, customerAggregates);
  }

  return aggregatesByCustomerId;
}

function sortDebtFinancialAggregates(
  aggregates: DebtFinancialAggregate[],
  defaultCurrency: Currency,
): DebtFinancialAggregate[] {
  return [...aggregates].sort((left, right) => {
    if (left.currency === defaultCurrency) {
      return -1;
    }

    if (right.currency === defaultCurrency) {
      return 1;
    }

    return left.currency.localeCompare(right.currency);
  });
}

function financialAggregateKey(customerId: string, currency: Currency): string {
  return `${customerId}:${currency}`;
}

function isCustomerCodeUniqueViolation(error: unknown): boolean {
  const postgresError =
    typeof error === 'object' && error !== null && 'cause' in error
      ? error.cause
      : error;

  return (
    typeof postgresError === 'object' &&
    postgresError !== null &&
    'code' in postgresError &&
    postgresError.code === '23505' &&
    'constraint' in postgresError &&
    postgresError.constraint === customerConstraints.ownerProfileLowerCodeUnique
  );
}
