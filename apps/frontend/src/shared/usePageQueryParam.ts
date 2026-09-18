import { useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router';

import { oneBasedPageSchema } from '@collectify/contracts';

export function usePageQueryParam(paramName: string) {
  const [searchParams, setSearchParams] = useSearchParams();
  const pageQuery = searchParams.get(paramName);
  const parsedPage = oneBasedPageSchema.safeParse(pageQuery ?? undefined);
  const page = parsedPage.success ? parsedPage.data : 1;
  const setPage = useCallback(
    (nextPage: number, options?: Parameters<typeof setSearchParams>[1]) => {
      const nextSearchParams = new URLSearchParams(searchParams);
      nextSearchParams.set(paramName, String(nextPage));
      setSearchParams(nextSearchParams, options);
    },
    [paramName, searchParams, setSearchParams],
  );

  useEffect(() => {
    if (pageQuery === null || pageQuery === String(page)) {
      return;
    }

    setPage(page, { replace: true });
  }, [page, pageQuery, setPage]);

  return { page, setPage };
}
