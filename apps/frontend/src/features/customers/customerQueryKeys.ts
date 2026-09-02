import type { CustomerListQuery } from '@collectify/contracts';

export const customerListQueryKey = ['customers', 'list'] as const;

export const customerListPageQueryKey = (query: CustomerListQuery) =>
  [...customerListQueryKey, query] as const;

export const customerDetailsQueryKey = (customerId: string) =>
  ['customers', customerId] as const;
