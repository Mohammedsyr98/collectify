import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';

import {
  customerListQuerySchema,
  type CustomerListItem,
  type CustomerListQuery,
} from '@collectify/contracts';

import { usePageQueryParam } from '../../shared/usePageQueryParam';
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
  const [searchParams, setSearchParams] = useSearchParams();
  const { page: currentPage, setPage: setCustomerPageQuery } =
    usePageQueryParam('page');
  const customerListQueryParams: CustomerListQuery = customerListQuerySchema.parse({
    page: currentPage,
    search: searchParams.get('search') ?? undefined,
  });
  const pendingSearchUrlUpdateRef = useRef<string | null>(null);
  const effectiveSearchValue = customerListQueryParams.search ?? '';
  const [searchValue, setSearchValue] = useState(effectiveSearchValue);
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
  const setCustomerSearchQuery = (search: string) => {
    setSearchValue(search);
  };

  useEffect(() => {
    if (pendingSearchUrlUpdateRef.current === effectiveSearchValue) {
      pendingSearchUrlUpdateRef.current = null;
      return;
    }

    setSearchValue(effectiveSearchValue);
  }, [effectiveSearchValue]);

  useEffect(() => {
    const normalizedSearch = searchValue.trim();

    if (normalizedSearch === effectiveSearchValue) {
      return undefined;
    }

    const debounceId = window.setTimeout(() => {
      const nextSearchParams = new URLSearchParams(searchParams);

      nextSearchParams.set('page', '1');

      if (normalizedSearch) {
        nextSearchParams.set('search', normalizedSearch);
      } else {
        nextSearchParams.delete('search');
      }

      pendingSearchUrlUpdateRef.current = normalizedSearch;
      setSearchParams(nextSearchParams);
    }, 500);

    return () => window.clearTimeout(debounceId);
  }, [effectiveSearchValue, searchParams, searchValue, setSearchParams]);

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
      onChange: setCustomerSearchQuery,
      value: searchValue,
    },
    status,
  };
}
