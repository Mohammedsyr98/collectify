import { Injectable } from '@nestjs/common';
import {
  customerApiErrorCode,
  customerListPageSize,
  type CreateCustomerRequest,
  type CustomerDetailsResponse,
  type CustomerListQuery,
  type CustomerListItem,
  type CustomerListFinancialSummary,
  type CustomerListResponse,
} from '@collectify/contracts';
import { and, desc, eq, or, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';

import type { AuthenticatedOwner } from '../auth';
import { DatabaseService } from '../database/database.service';
import { customerConstraints, customers } from '../database/schema';
import { customerException } from './customers.errors';

type CustomerRow = typeof customers.$inferSelect;
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

      return toCustomerDetailsResponse(customer);
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

    return toCustomerDetailsResponse(customer);
  }

  async listCustomers(
    currentOwner: AuthenticatedOwner,
    query: CustomerListQuery,
  ): Promise<CustomerListResponse> {
    const ownerProfileId = currentOwner.ownerProfile.id;
    const offset = (query.page - 1) * customerListPageSize;
    const listFilter = customerListFilter(ownerProfileId, query.search);
    const [{ totalItems } = { totalItems: 0 }] = await this.databaseService.db
      .select({ totalItems: sql<number>`count(*)::int` })
      .from(customers)
      .where(listFilter);
    const customerRows = await this.databaseService.db
      .select()
      .from(customers)
      .where(listFilter)
      .orderBy(desc(customers.createdAt), desc(customers.id))
      .limit(customerListPageSize)
      .offset(offset);

    return {
      items: customerRows.map(toCustomerListItemResponse),
      page: query.page,
      pageSize: customerListPageSize,
      totalItems,
      totalPages: Math.ceil(totalItems / customerListPageSize),
    };
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
): CustomerDetailsResponse {
  return {
    id: customer.id,
    name: customer.name,
    code: customer.code,
    phoneNumber: customer.phoneNumber,
    address: customer.address,
    createdAt: customer.createdAt.toISOString(),
    updatedAt: customer.updatedAt.toISOString(),
    financialSummary: {
      totalDebtAmount: '0.00',
      totalPaidAmount: '0.00',
      balanceAmount: '0.00',
    },
  };
}

function toCustomerListItemResponse(customer: CustomerRow): CustomerListItem {
  return {
    id: customer.id,
    name: customer.name,
    code: customer.code,
    phoneNumber: customer.phoneNumber,
    createdAt: customer.createdAt.toISOString(),
    updatedAt: customer.updatedAt.toISOString(),
    financialSummary: neutralCustomerListFinancialSummary(),
  };
}

function neutralCustomerListFinancialSummary(): CustomerListFinancialSummary {
  return {
    balancesByCurrency: [],
    nextDueDate: null,
  };
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
