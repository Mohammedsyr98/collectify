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
import { and, desc, eq, or, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';

import type { AuthenticatedOwner } from '../auth';
import { DatabaseService } from '../database/database.service';
import { customerConstraints, customers } from '../database/schema';
import {
  CustomerReceivables,
  type CustomerCurrencySummary,
} from '../receivables/customer-receivables';
import { calculatePagination } from '../shared/pagination';
import { caseInsensitiveLiteralSubstring } from '../shared/literal-search';
import { customerException } from './customers.errors';

type CustomerRow = typeof customers.$inferSelect;
@Injectable()
export class CustomersService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly customerReceivables: CustomerReceivables,
  ) {}

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
    const operationInstant = new Date();
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
      currentOwner.ownerProfile.id,
      customer.id,
      currentOwner.ownerProfile.defaultCurrency,
      operationInstant,
    );

    return toCustomerDetailsResponse(customer, financialSummary);
  }

  async updateCustomer(
    currentOwner: AuthenticatedOwner,
    customerId: string,
    request: UpdateCustomerRequest,
  ): Promise<UpdateCustomerResponse> {
    const operationInstant = new Date();
    const updateValues: Partial<typeof customers.$inferInsert> = {
      ...request,
      updatedAt: operationInstant,
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
        currentOwner.ownerProfile.id,
        customer.id,
        currentOwner.ownerProfile.defaultCurrency,
        operationInstant,
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
    const operationInstant = new Date();
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
    const summariesByCustomerId =
      await this.customerReceivables.summarizeCustomers({
        ownerProfileId,
        customerIds: customerRows.map((customer) => customer.id),
        asOf: operationInstant,
        preferredCurrency: currentOwner.ownerProfile.defaultCurrency,
      });

    return {
      items: customerRows.map((customer) =>
        toCustomerListItemResponse(
          customer,
          summariesByCustomerId.get(customer.id) ?? [],
        ),
      ),
      ...paginationMetadata,
    };
  }

  private async getFinancialSummary(
    ownerProfileId: string,
    customerId: string,
    defaultCurrency: Currency,
    operationInstant: Date,
  ): Promise<CustomerDetailsResponse['financialSummary']> {
    const summariesByCustomerId =
      await this.customerReceivables.summarizeCustomers({
        ownerProfileId,
        customerIds: [customerId],
        asOf: operationInstant,
        preferredCurrency: defaultCurrency,
      });

    return toCustomerDetailsFinancialSummary(
      summariesByCustomerId.get(customerId) ?? [],
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
  summaries: readonly CustomerCurrencySummary[],
): CustomerListItem {
  return {
    id: customer.id,
    name: customer.name,
    code: customer.code,
    phoneNumber: customer.phoneNumber,
    createdAt: customer.createdAt.toISOString(),
    updatedAt: customer.updatedAt.toISOString(),
    financialSummary: {
      balancesByCurrency: summaries.map((summary) => ({
        currency: summary.currency,
        remainingAmount: summary.remainingAmount,
        overdueAmount: summary.overdueAmount,
      })),
    },
  };
}

function toCustomerDetailsFinancialSummary(
  summaries: readonly CustomerCurrencySummary[],
): CustomerDetailsResponse['financialSummary'] {
  return summaries.map((summary) => ({
    currency: summary.currency,
    totalDebtAmount: summary.totalDebtAmount,
    totalPaidAmount: summary.totalPaidAmount,
    remainingAmount: summary.remainingAmount,
  }));
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
