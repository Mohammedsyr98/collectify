import { useCallback } from 'react';
import { useSearchParams } from 'react-router';

import {
  debtListQuerySchema,
  oneBasedPageSchema,
  type DebtListQuery,
} from '@collectify/contracts';

import { useDebtListQuery } from './debtQueries';

export function useDebtListView(customerId: string | undefined) {
  const [searchParams, setSearchParams] = useSearchParams();
  const pageQuery = searchParams.get('debtPage');
  const parsedPage = oneBasedPageSchema.safeParse(pageQuery ?? undefined);
  const query: DebtListQuery = debtListQuerySchema.parse({
    page: parsedPage.success ? parsedPage.data : undefined,
  });

  const debtListQuery = useDebtListQuery(customerId, query);
  const currentPage = query.page;
  const totalPages = debtListQuery.data?.totalPages ?? 0;
  const setDebtPageQuery = useCallback(
    (page: number) => {
      const nextSearchParams = new URLSearchParams(searchParams);
      nextSearchParams.set('debtPage', String(page));
      setSearchParams(nextSearchParams);
    },
    [searchParams, setSearchParams],
  );

  return {
    ...debtListQuery,
    pagination: {
      canMoveToNextPage: !debtListQuery.isFetching && currentPage < totalPages,
      canMoveToPreviousPage: !debtListQuery.isFetching && currentPage > 1,
      moveToNextPage: () => setDebtPageQuery(currentPage + 1),
      moveToPreviousPage: () => setDebtPageQuery(currentPage - 1),
      showsControls: debtListQuery.isSuccess && totalPages > 1,
    },
  };
}
