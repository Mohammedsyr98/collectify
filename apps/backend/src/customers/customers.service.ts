import { Injectable } from '@nestjs/common';
import {
  customerApiErrorCode,
  type CreateCustomerRequest,
  type CustomerDetailsResponse,
  type CustomerListItem,
  type CustomerListFinancialSummary,
  type CustomerListResponse,
} from '@collectify/contracts';
import { and, desc, eq, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';

import type { AuthenticatedOwner } from '../auth';
import { DatabaseService } from '../database/database.service';
import { customerConstraints, customers } from '../database/schema';
import { customerException } from './customers.errors';

type CustomerRow = typeof customers.$inferSelect;
const customerListPageSize = 25;

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
  ): Promise<CustomerListResponse> {
    const ownerProfileId = currentOwner.ownerProfile.id;
    const [{ totalItems } = { totalItems: 0 }] = await this.databaseService.db
      .select({ totalItems: sql<number>`count(*)::int` })
      .from(customers)
      .where(eq(customers.ownerProfileId, ownerProfileId));
    const customerRows = await this.databaseService.db
      .select()
      .from(customers)
      .where(eq(customers.ownerProfileId, ownerProfileId))
      .orderBy(desc(customers.createdAt), desc(customers.id))
      .limit(customerListPageSize);

    return {
      items: customerRows.map(toCustomerListItemResponse),
      page: 1,
      pageSize: customerListPageSize,
      totalItems,
      totalPages: Math.ceil(totalItems / customerListPageSize),
    };
  }
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
