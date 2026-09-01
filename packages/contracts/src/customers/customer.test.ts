import { describe, expect, it } from 'vitest';

import {
  createCustomerRequestSchema,
  customerDetailsResponseSchema,
  customerErrorResponseSchema,
  customerListPageSize,
  customerListResponseSchema,
} from './customer.js';
import { customerApiErrorCode } from './api-error-codes.js';
import { customerValidationCode } from './validation-codes.js';

describe('customer contracts', () => {
  it('normalizes a customer create request', () => {
    expect(
      createCustomerRequestSchema.parse({
        name: '  Acme Market  ',
        code: '  ACME-001  ',
        phoneNumber: '  +90 555 123 45 67  ',
        address: '  Istanbul  ',
      }),
    ).toEqual({
      name: 'Acme Market',
      code: 'ACME-001',
      phoneNumber: '+90 555 123 45 67',
      address: 'Istanbul',
    });
  });

  it('omits omitted or blank customer address from the serialized create request', () => {
    const omittedAddressRequest = createCustomerRequestSchema.parse({
      name: 'Acme Market',
      code: 'ACME-001',
      phoneNumber: '+90 555 123 45 67',
    });
    const blankAddressRequest = createCustomerRequestSchema.parse({
      name: 'Acme Market',
      code: 'ACME-001',
      phoneNumber: '+90 555 123 45 67',
      address: '   ',
    });

    expect(omittedAddressRequest.address).toBeUndefined();
    expect(JSON.parse(JSON.stringify(omittedAddressRequest))).toEqual({
      name: 'Acme Market',
      code: 'ACME-001',
      phoneNumber: '+90 555 123 45 67',
    });
    expect(blankAddressRequest.address).toBeUndefined();
    expect(JSON.parse(JSON.stringify(blankAddressRequest))).toEqual({
      name: 'Acme Market',
      code: 'ACME-001',
      phoneNumber: '+90 555 123 45 67',
    });
  });

  it('returns stable customer validation codes for required input', () => {
    const result = createCustomerRequestSchema.safeParse({
      name: '   ',
      code: '',
      phoneNumber: '  ',
    });

    expect(result.success).toBe(false);

    if (result.success) {
      return;
    }

    expect(
      result.error.issues.map((issue) => [issue.path[0], issue.message]),
    ).toEqual([
      ['name', customerValidationCode.customerNameRequired],
      ['code', customerValidationCode.customerCodeRequired],
      ['phoneNumber', customerValidationCode.customerPhoneNumberRequired],
    ]);
  });

  it('accepts customer details with nullable address and neutral financial summary', () => {
    expect(
      customerDetailsResponseSchema.parse({
        id: 'customer_123',
        name: 'Acme Market',
        code: 'ACME-001',
        phoneNumber: '+90 555 123 45 67',
        address: null,
        createdAt: '2026-08-28T12:00:00.000Z',
        updatedAt: '2026-08-28T12:00:00.000Z',
        financialSummary: {
          totalDebtAmount: '0.00',
          totalPaidAmount: '0.00',
          balanceAmount: '0.00',
        },
      }),
    ).toEqual({
      id: 'customer_123',
      name: 'Acme Market',
      code: 'ACME-001',
      phoneNumber: '+90 555 123 45 67',
      address: null,
      createdAt: '2026-08-28T12:00:00.000Z',
      updatedAt: '2026-08-28T12:00:00.000Z',
      financialSummary: {
        totalDebtAmount: '0.00',
        totalPaidAmount: '0.00',
        balanceAmount: '0.00',
      },
    });
  });

  it('accepts customer list responses with per-currency decimal summaries', () => {
    expect(
      customerListResponseSchema.parse({
        items: [
          {
            id: 'customer_123',
            name: 'Acme Market',
            code: 'ACME-001',
            phoneNumber: '+90 555 123 45 67',
            createdAt: '2026-08-28T12:00:00.000Z',
            updatedAt: '2026-08-28T12:00:00.000Z',
            financialSummary: {
              balancesByCurrency: [
                {
                  currency: 'USD',
                  remainingAmount: '125.50',
                  overdueAmount: '25.00',
                },
              ],
              nextDueDate: '2026-09-15',
            },
          },
        ],
        page: 1,
        pageSize: 25,
        totalItems: 1,
        totalPages: 1,
      }),
    ).toMatchObject({
      items: [
        {
          financialSummary: {
            balancesByCurrency: [
              {
                currency: 'USD',
                remainingAmount: '125.50',
                overdueAmount: '25.00',
              },
            ],
            nextDueDate: '2026-09-15',
          },
        },
      ],
    });
  });

  it('exports the default customer list page size', () => {
    expect(customerListPageSize).toBe(25);
  });

  it('accepts controlled customer API error responses', () => {
    expect(
      customerErrorResponseSchema.parse({
        code: customerApiErrorCode.customerCodeAlreadyExists,
        message: 'Customer code already exists.',
        fieldErrors: {
          code: ['Customer code already exists.'],
        },
      }),
    ).toMatchObject({
      code: 'CUSTOMER_CODE_ALREADY_EXISTS',
    });
  });
});
