import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';

const searchDebounceMs = 500;

export function useDebouncedSearchQuery({
  pageParamName,
  searchParamName,
}: {
  pageParamName: string;
  searchParamName: string;
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const pendingSearchUrlUpdateRef = useRef<string | null>(null);
  const effectiveSearchValue = searchParams.get(searchParamName)?.trim() ?? '';
  const [searchValue, setSearchValue] = useState(effectiveSearchValue);

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

      nextSearchParams.set(pageParamName, '1');

      if (normalizedSearch) {
        nextSearchParams.set(searchParamName, normalizedSearch);
      } else {
        nextSearchParams.delete(searchParamName);
      }

      pendingSearchUrlUpdateRef.current = normalizedSearch;
      setSearchParams(nextSearchParams);
    }, searchDebounceMs);

    return () => window.clearTimeout(debounceId);
  }, [
    effectiveSearchValue,
    pageParamName,
    searchParamName,
    searchParams,
    searchValue,
    setSearchParams,
  ]);

  return {
    effectiveValue: effectiveSearchValue,
    onChange: setSearchValue,
    value: searchValue,
  };
}
