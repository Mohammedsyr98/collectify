import { useEffect } from 'react';

import {
  customerListQuerySchema,
  type CustomerListItem,
  type CustomerListQuery,
} from '@collectify/contracts';

import { usePageQueryParam } from '../../shared/usePageQueryParam';
import { useDebouncedSearchQuery } from '../../shared/useDebouncedSearchQuery';
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
  | { status: 'ready' };

export function useCustomerListView() {
  const { page: currentPage, setPage: setCustomerPageQuery } =
    usePageQueryParam('page');
  const search = useDebouncedSearchQuery({
    pageParamName: 'page',
    searchParamName: 'search',
  });
  const customerListQueryParams: CustomerListQuery = customerListQuerySchema.parse({
    page: currentPage,
    search: search.effectiveValue || undefined,
  });
  const customerListQuery = useCustomerListQuery(customerListQueryParams);
  const customerList = customerListQuery.data;
  const customers = customerList?.items ?? emptyCustomers;
  const totalPages = customerList?.totalPages ?? 0;
  const totalItems = customerList?.totalItems ?? 0;
  const lastAvailablePage = totalPages > 0 ? totalPages : 1;
  const hasCustomers = totalItems > 0;
  const hasVisibleCustomers = customers.length > 0;
  const isLoadingRows =
    customerListQuery.isLoading ||
    customerListQuery.isPlaceholderData ||
    (customerListQuery.isSuccess && hasCustomers && !hasVisibleCustomers);
  useEffect(() => {
    if (!customerListQuery.isSuccess || customerListQuery.isPlaceholderData) {
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
    setCustomerPageQuery,
  ]);

  const status: CustomerListViewStatus = (() => {
    if (customerListQuery.isError) {
      return {
        isRetrying: customerListQuery.isFetching,
        retry: customerListQuery.refetch,
        status: 'error',
      };
    }

    if (isLoadingRows) {
      return { status: 'loading' };
    }

    if (customerListQuery.isSuccess && !hasCustomers) {
      return { status: 'empty' };
    }

    return { status: 'ready' };
  })();

  return {
    customers,
    pagination: {
      canMoveToNextPage: !isLoadingRows && currentPage < totalPages,
      canMoveToPreviousPage: !isLoadingRows && currentPage > 1,
      moveToNextPage: () => setCustomerPageQuery(currentPage + 1),
      moveToPreviousPage: () => setCustomerPageQuery(currentPage - 1),
      showsControls: customerListQuery.isSuccess && totalPages > 1,
    },
    search: {
      onChange: search.onChange,
      value: search.value,
    },
    status,
  };
}
