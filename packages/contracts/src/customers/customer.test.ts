import { describe, expect, it } from 'vitest';

import {
  createCustomerRequestSchema,
  customerDetailsResponseSchema,
  customerListQuerySchema,
  customerErrorResponseSchema,
  customerListPageSize,
  customerListResponseSchema,
  updateCustomerRequestSchema,
} from './customer.js';
import { customerApiErrorCode } from './api-error-codes.js';
import { oneBasedPageSchema } from '../pagination.js';
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

  it('normalizes a customer update request to only submitted fields', () => {
    const parsed = updateCustomerRequestSchema.parse({
      name: '  Acme Wholesale  ',
    });

    expect(parsed).toEqual({
      name: 'Acme Wholesale',
    });
    expect(Object.hasOwn(parsed, 'code')).toBe(false);
    expect(Object.hasOwn(parsed, 'phoneNumber')).toBe(false);
    expect(Object.hasOwn(parsed, 'address')).toBe(false);
  });

  it('normalizes a blank customer update address into an explicit clear value', () => {
    expect(
      updateCustomerRequestSchema.parse({
        address: '   ',
      }),
    ).toEqual({
      address: null,
    });
  });

  it('accepts a null customer update address as an explicit clear value', () => {
    expect(
      updateCustomerRequestSchema.parse({
        address: null,
      }),
    ).toEqual({
      address: null,
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

  it('accepts customer details with an empty currency financial summary', () => {
    expect(
      customerDetailsResponseSchema.parse({
        id: 'customer_123',
        name: 'Acme Market',
        code: 'ACME-001',
        phoneNumber: '+90 555 123 45 67',
        address: null,
        createdAt: '2026-08-28T12:00:00.000Z',
        updatedAt: '2026-08-28T12:00:00.000Z',
        financialSummary: [],
      }),
    ).toEqual({
      id: 'customer_123',
      name: 'Acme Market',
      code: 'ACME-001',
      phoneNumber: '+90 555 123 45 67',
      address: null,
      createdAt: '2026-08-28T12:00:00.000Z',
      updatedAt: '2026-08-28T12:00:00.000Z',
      financialSummary: [],
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
          },
        },
      ],
    });
  });

  it('exports the default customer list page size', () => {
    expect(customerListPageSize).toBe(25);
  });

  it('enforces strict one-based page input while defaulting omitted pages', () => {
    expect(oneBasedPageSchema.parse(undefined)).toBe(1);
    expect(oneBasedPageSchema.parse('2')).toBe(2);
    expect(oneBasedPageSchema.parse(3)).toBe(3);

    for (const value of ['', '0', '-1', '1.5', '01', 'invalid', [], 0, -1, 1.5]) {
      expect(oneBasedPageSchema.safeParse(value).success).toBe(false);
    }
  });

  it('normalizes customer list search terms', () => {
    expect(
      customerListQuerySchema.parse({
        page: '2',
        search: '  acme  ',
      }),
    ).toEqual({
      page: 2,
      search: 'acme',
    });
    expect(customerListQuerySchema.parse({ search: '   ' })).toEqual({
      page: 1,
    });
    expect(customerListQuerySchema.safeParse({ page: 'invalid' }).success).toBe(
      false,
    );
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
