import { useCallback, useEffect, useState } from 'react';

import {
  debtListQuerySchema,
  type DebtListQuery,
} from '@collectify/contracts';

import { usePageQueryParam } from '../../shared/usePageQueryParam';
import { useDebtListQuery } from './debtQueries';

type DebtListViewStatus =
  | { status: 'loading' }
  | {
      isRetrying: boolean;
      retry: ReturnType<typeof useDebtListQuery>['refetch'];
      status: 'error';
    }
  | { status: 'ready' };

export function useDebtListView(customerId: string | undefined) {
  const { page: currentPage, setPage: setDebtPageQuery } =
    usePageQueryParam('debtPage');
  const query: DebtListQuery = debtListQuerySchema.parse({
    page: currentPage,
  });

  const debtListQuery = useDebtListQuery(customerId, query);
  const [isRetrying, setIsRetrying] = useState(false);
  const retry = useCallback(async () => {
    setIsRetrying(true);

    try {
      return await debtListQuery.refetch();
    } finally {
      setIsRetrying(false);
    }
  }, [debtListQuery.refetch]);
  const debtList = debtListQuery.data;
  const debts = debtList?.items ?? [];
  const totalPages = debtList?.totalPages ?? 0;
  const totalItems = debtList?.totalItems ?? 0;
  const isLoadingRows =
    debtListQuery.isLoading ||
    debtListQuery.isPlaceholderData ||
    (debtListQuery.isSuccess && totalItems > 0 && debts.length === 0);
  const lastAvailablePage = totalPages > 0 ? totalPages : 1;
  useEffect(() => {
    if (
      !debtListQuery.isSuccess ||
      debtListQuery.isPlaceholderData ||
      currentPage <= lastAvailablePage
    ) {
      return;
    }

    setDebtPageQuery(lastAvailablePage, { replace: true });
  }, [
    currentPage,
    debtListQuery.isPlaceholderData,
    debtListQuery.isSuccess,
    lastAvailablePage,
    setDebtPageQuery,
  ]);

  const status: DebtListViewStatus = (() => {
    if (debtListQuery.isError || isRetrying) {
      return {
        isRetrying,
        retry,
        status: 'error',
      };
    }

    if (isLoadingRows) {
      return { status: 'loading' };
    }

    return { status: 'ready' };
  })();

  return {
    ...debtListQuery,
    isLoading: isLoadingRows,
    status,
    pagination: {
      canMoveToNextPage: !isLoadingRows && currentPage < totalPages,
      canMoveToPreviousPage: !isLoadingRows && currentPage > 1,
      moveToNextPage: () => setDebtPageQuery(currentPage + 1),
      moveToPreviousPage: () => setDebtPageQuery(currentPage - 1),
      showsControls: debtListQuery.isSuccess && totalPages > 1,
    },
  };
}
