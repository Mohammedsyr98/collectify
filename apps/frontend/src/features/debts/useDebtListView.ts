import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';

import {
  debtListQuerySchema,
  oneBasedPageSchema,
  type DebtListQuery,
} from '@collectify/contracts';

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
  const [searchParams, setSearchParams] = useSearchParams();
  const pageQuery = searchParams.get('debtPage');
  const parsedPage = oneBasedPageSchema.safeParse(pageQuery ?? undefined);
  const query: DebtListQuery = debtListQuerySchema.parse({
    page: parsedPage.success ? parsedPage.data : undefined,
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
  const currentPage = query.page;
  const totalPages = debtList?.totalPages ?? 0;
  const totalItems = debtList?.totalItems ?? 0;
  const isLoadingRows =
    debtListQuery.isLoading ||
    debtListQuery.isPlaceholderData ||
    (debtListQuery.isSuccess && totalItems > 0 && debts.length === 0);
  const lastAvailablePage = totalPages > 0 ? totalPages : 1;
  const setDebtPageQuery = useCallback(
    (page: number, options?: Parameters<typeof setSearchParams>[1]) => {
      const nextSearchParams = new URLSearchParams(searchParams);
      nextSearchParams.set('debtPage', String(page));
      setSearchParams(nextSearchParams, options);
    },
    [searchParams, setSearchParams],
  );

  useEffect(() => {
    const normalizedPage = String(currentPage);

    if (pageQuery === null || pageQuery === normalizedPage) {
      return;
    }

    setDebtPageQuery(currentPage, { replace: true });
  }, [currentPage, pageQuery, setDebtPageQuery]);

  useEffect(() => {
    if (
      !debtListQuery.isSuccess ||
      pageQuery === null ||
      currentPage <= lastAvailablePage
    ) {
      return;
    }

    setDebtPageQuery(lastAvailablePage, { replace: true });
  }, [
    currentPage,
    debtListQuery.isSuccess,
    lastAvailablePage,
    pageQuery,
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
