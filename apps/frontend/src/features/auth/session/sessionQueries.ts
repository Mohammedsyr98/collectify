import { useQuery } from '@tanstack/react-query';

import { getSession } from '../api/get-session';

export const sessionQueryKey = ['session'] as const;

export function useSessionQuery() {
  return useQuery({
    queryKey: sessionQueryKey,
    queryFn: getSession,
  });
}
