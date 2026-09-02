import type {
  CustomerDetailsResponse,
  CustomerListResponse,
} from '@collectify/contracts';

export const baseCustomer: CustomerDetailsResponse = {
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
};

export const customerList: CustomerListResponse = {
  items: [
    {
      id: 'customer_123',
      name: 'Acme Market',
      code: 'ACME-001',
      phoneNumber: '+90 555 123 45 67',
      createdAt: '2026-08-28T12:00:00.000Z',
      updatedAt: '2026-08-28T12:00:00.000Z',
      financialSummary: {
        balancesByCurrency: [],
        nextDueDate: null,
      },
    },
    {
      id: 'customer_456',
      name: 'North Star Cafe',
      code: 'NSC-002',
      phoneNumber: '+90 555 456 78 90',
      createdAt: '2026-08-29T12:00:00.000Z',
      updatedAt: '2026-08-29T12:00:00.000Z',
      financialSummary: {
        balancesByCurrency: [],
        nextDueDate: null,
      },
    },
  ],
  page: 1,
  pageSize: 25,
  totalItems: 2,
  totalPages: 1,
};

export const emptyCustomerList: CustomerListResponse = {
  items: [],
  page: 1,
  pageSize: 25,
  totalItems: 0,
  totalPages: 0,
};

