import type { QueryClient } from '@tanstack/react-query';

import type { SessionResponse } from '@collectify/contracts';

import { sessionQueryKey } from './sessionQueries';

const signedOutSession: SessionResponse = {
  authenticated: false,
  user: null,
  ownerProfile: null,
};

export const sessionCache = {
  get(queryClient: QueryClient): SessionResponse | undefined {
    return queryClient.getQueryData<SessionResponse>(sessionQueryKey);
  },

  setCurrent(queryClient: QueryClient, session: SessionResponse): void {
    queryClient.setQueryData(sessionQueryKey, session);
  },

  setSignedOut(queryClient: QueryClient): void {
    queryClient.setQueryData(sessionQueryKey, signedOutSession);
  },

  async refresh(queryClient: QueryClient): Promise<void> {
    await queryClient.invalidateQueries({ queryKey: sessionQueryKey });
  },
};
