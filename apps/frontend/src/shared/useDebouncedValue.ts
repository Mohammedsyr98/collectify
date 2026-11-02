import { useEffect, useState } from 'react';

const defaultDebounceMs = 500;

export function useDebouncedValue<T>(value: T, delay = defaultDebounceMs) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const debounceId = window.setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => window.clearTimeout(debounceId);
  }, [delay, value]);

  return debouncedValue;
}
