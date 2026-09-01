import { useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router';

import {
  customerListQuerySchema,
  type CustomerListItem,
  type CustomerListQuery,
} from '@collectify/contracts';

import { useCustomerListQuery } from './customerQueries';

const emptyCustomers: CustomerListItem[] = [];

type CustomerListViewStatus =
  | { status: 'loading' }
  | {
      isRetrying: boolean;
      retry: ReturnType<typeof useCustomerListQuery>['refetch'];
      status: 'error';
    }
  | { status: 'empty' }
  | { isShowingPreviousPage: boolean; status: 'ready' };

export function useCustomerListView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const customerListQueryParams: CustomerListQuery =
    customerListQuerySchema.parse({
      page: searchParams.get('page') ?? undefined,
    });
  const pageQuery = searchParams.get('page');
  const customerListQuery = useCustomerListQuery(customerListQueryParams);
  const customerList = customerListQuery.data;
  const customers = customerList?.items ?? emptyCustomers;
  const currentPage = customerListQueryParams.page;
  const totalPages = customerList?.totalPages ?? 0;
  const totalItems = customerList?.totalItems ?? 0;
  const lastAvailablePage = totalPages > 0 ? totalPages : 1;
  const hasCustomers = totalItems > 0;
  const hasVisibleCustomers = customers.length > 0;
  const isShowingPreviousPage =
    customerListQuery.isPlaceholderData && customerListQuery.isFetching;
  const setCustomerPageQuery = useCallback(
    (page: number, options?: Parameters<typeof setSearchParams>[1]) => {
      const nextSearchParams = new URLSearchParams(searchParams);
      nextSearchParams.set('page', String(page));
      setSearchParams(nextSearchParams, options);
    },
    [searchParams, setSearchParams],
  );

  useEffect(() => {
    const normalizedPage = String(customerListQueryParams.page);

    if (pageQuery === null || pageQuery === normalizedPage) {
      return;
    }

    setCustomerPageQuery(customerListQueryParams.page, { replace: true });
  }, [customerListQueryParams.page, pageQuery, setCustomerPageQuery]);

  useEffect(() => {
    if (
      !customerListQuery.isSuccess ||
      customerListQuery.isPlaceholderData ||
      pageQuery === null
    ) {
      return;
    }

    if (customerListQueryParams.page <= lastAvailablePage) {
      return;
    }

    setCustomerPageQuery(lastAvailablePage, { replace: true });
  }, [
    customerListQuery.isPlaceholderData,
    customerListQuery.isSuccess,
    customerListQueryParams.page,
    lastAvailablePage,
    pageQuery,
    setCustomerPageQuery,
  ]);

  const status: CustomerListViewStatus = (() => {
    if (customerListQuery.isLoading) {
      return { status: 'loading' };
    }

    if (customerListQuery.isError) {
      return {
        isRetrying: customerListQuery.isFetching,
        retry: customerListQuery.refetch,
        status: 'error',
      };
    }

    if (customerListQuery.isSuccess && !hasCustomers) {
      return { status: 'empty' };
    }

    if (!hasVisibleCustomers) {
      return { status: 'loading' };
    }

    return {
      isShowingPreviousPage,
      status: 'ready',
    };
  })();

  return {
    customers,
    pagination: {
      canMoveToNextPage: currentPage < totalPages,
      canMoveToPreviousPage: currentPage > 1,
      moveToNextPage: () => setCustomerPageQuery(currentPage + 1),
      moveToPreviousPage: () => setCustomerPageQuery(currentPage - 1),
      showsControls: customerListQuery.isSuccess && totalPages > 1,
    },
    status,
  };
}
