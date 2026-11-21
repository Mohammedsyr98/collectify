import {
  paymentHistoryPageSize,
  type CustomerDetailsResponse,
  type CustomerListResponse,
} from '@collectify/contracts';
import { http, HttpResponse } from 'msw';

import { getBackendUrl } from '@/shared/api';

import { server } from './render';

export const baseCustomer: CustomerDetailsResponse = {
  id: 'customer_123',
  name: 'Acme Market',
  code: 'ACME-001',
  phoneNumber: '+90 555 123 45 67',
  address: null,
  createdAt: '2026-08-28T12:00:00.000Z',
  updatedAt: '2026-08-28T12:00:00.000Z',
  financialSummary: [],
};

export const customerList: CustomerListResponse = {
  items: [
    {
      id: baseCustomer.id,
      name: baseCustomer.name,
      code: baseCustomer.code,
      phoneNumber: baseCustomer.phoneNumber,
      createdAt: baseCustomer.createdAt,
      updatedAt: baseCustomer.updatedAt,
      financialSummary: { balancesByCurrency: [] },
    },
  ],
  page: 1,
  pageSize: 25,
  totalItems: 1,
  totalPages: 1,
};

export const emptyCustomerList: CustomerListResponse = {
  items: [],
  page: 1,
  pageSize: 25,
  totalItems: 0,
  totalPages: 0,
};

export function resetCustomerTestEnvironment() {
  window.localStorage.clear();
  document.documentElement.lang = '';
  document.documentElement.removeAttribute('dir');
  Object.defineProperty(window.navigator, 'languages', {
    configurable: true,
    value: ['en-US'],
  });
  server.use(
    http.get(`${getBackendUrl()}/customers/:customerId/payments`, () =>
      HttpResponse.json({
        items: [],
        pageSize: paymentHistoryPageSize,
        totalItems: 0,
        nextCursor: null,
      }),
    ),
  );
}
