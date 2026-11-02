import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';

import { useDebouncedValue } from './useDebouncedValue';

export function useDebouncedSearchQuery({
  pageParamName,
  searchParamName,
}: {
  pageParamName: string;
  searchParamName: string;
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const pendingSearchUrlUpdateRef = useRef<string | null>(null);
  const syncingFromUrlRef = useRef<string | null>(null);
  const effectiveSearchValue = searchParams.get(searchParamName)?.trim() ?? '';
  const [searchValue, setSearchValue] = useState(effectiveSearchValue);
  const debouncedSearchValue = useDebouncedValue(searchValue);

  useEffect(() => {
    if (pendingSearchUrlUpdateRef.current === effectiveSearchValue) {
      pendingSearchUrlUpdateRef.current = null;
      return;
    }

    syncingFromUrlRef.current = effectiveSearchValue;
    setSearchValue(effectiveSearchValue);
  }, [effectiveSearchValue]);

  useEffect(() => {
    if (syncingFromUrlRef.current !== null) {
      if (syncingFromUrlRef.current === debouncedSearchValue.trim()) {
        syncingFromUrlRef.current = null;
      }

      return undefined;
    }

    const normalizedSearch = debouncedSearchValue.trim();

    if (normalizedSearch === effectiveSearchValue) {
      return undefined;
    }

    const nextSearchParams = new URLSearchParams(searchParams);

    nextSearchParams.set(pageParamName, '1');

    if (normalizedSearch) {
      nextSearchParams.set(searchParamName, normalizedSearch);
    } else {
      nextSearchParams.delete(searchParamName);
    }

    pendingSearchUrlUpdateRef.current = normalizedSearch;
    setSearchParams(nextSearchParams);
    return undefined;
  }, [
    debouncedSearchValue,
    effectiveSearchValue,
    pageParamName,
    searchParamName,
    searchParams,
    setSearchParams,
  ]);

  return {
    effectiveValue: effectiveSearchValue,
    onChange: setSearchValue,
    value: searchValue,
  };
}
