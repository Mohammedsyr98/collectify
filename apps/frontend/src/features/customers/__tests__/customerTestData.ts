import type {
  CustomerDetailsResponse,
  CustomerListItem,
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

export const northStarCustomer: CustomerDetailsResponse = {
  ...baseCustomer,
  id: 'customer_456',
  name: 'North Star Cafe',
  code: 'NSC-002',
  phoneNumber: '+90 555 456 78 90',
  createdAt: '2026-08-29T12:00:00.000Z',
  updatedAt: '2026-08-29T12:00:00.000Z',
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

export const financialCustomer: CustomerListItem = {
  id: 'customer_financial',
  name: 'South Ledger',
  code: 'SL-003',
  phoneNumber: '+90 555 700 00 03',
  createdAt: '2026-08-30T12:00:00.000Z',
  updatedAt: '2026-08-30T12:00:00.000Z',
  financialSummary: {
    balancesByCurrency: [
      {
        currency: 'USD',
        remainingAmount: '125.50',
        overdueAmount: '5.00',
      },
      {
        currency: 'EUR',
        remainingAmount: '80.00',
        overdueAmount: '0.00',
      },
      {
        currency: 'TRY',
        remainingAmount: '12.30',
        overdueAmount: '2.00',
      },
    ],
    nextDueDate: '2026-09-15',
  },
};

export const financialCustomerList: CustomerListResponse = {
  items: [financialCustomer],
  page: 1,
  pageSize: 25,
  totalItems: 1,
  totalPages: 1,
};

export function resetCustomerTestEnvironment() {
  window.localStorage.clear();
  document.documentElement.lang = '';
  document.documentElement.removeAttribute('dir');
  Object.defineProperty(window.navigator, 'languages', {
    configurable: true,
    value: ['en-US'],
  });
}
