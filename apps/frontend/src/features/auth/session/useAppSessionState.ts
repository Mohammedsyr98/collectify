import { useEffect } from 'react';

import type { OwnerProfile, SessionResponse } from '@collectify/contracts';

import { useSessionQuery } from './sessionQueries';
import { useOwnerProfileLanguageSync } from './useOwnerProfileLanguageSync';

type AuthenticatedSession = Extract<SessionResponse, { authenticated: true }>;
type OwnerWorkspaceSession = AuthenticatedSession & {
  ownerProfile: OwnerProfile;
};

export type AppSessionState =
  | { status: 'loading' }
  | { status: 'sessionUnavailable' }
  | { status: 'signedOut' }
  | { status: 'ownerSetupIncomplete' }
  | { session: OwnerWorkspaceSession; status: 'ownerWorkspace' };

export function useAppSessionState(): AppSessionState {
  const sessionQuery = useSessionQuery();
  const { isOwnerProfileLanguageSynced, syncOwnerProfileLanguage } =
    useOwnerProfileLanguageSync();
  const session = sessionQuery.data;
  const ownerProfile = session?.authenticated ? session.ownerProfile : null;
  const isOwnerWorkspaceLanguagePending =
    !!ownerProfile && !isOwnerProfileLanguageSynced(ownerProfile);

  useEffect(() => {
    if (!ownerProfile || !isOwnerWorkspaceLanguagePending) {
      return;
    }

    void syncOwnerProfileLanguage(ownerProfile);
  }, [
    isOwnerWorkspaceLanguagePending,
    ownerProfile,
    syncOwnerProfileLanguage,
  ]);

  if (sessionQuery.isPending || isOwnerWorkspaceLanguagePending) {
    return { status: 'loading' };
  }

  if (sessionQuery.isError) {
    return { status: 'sessionUnavailable' };
  }

  if (!session) {
    return { status: 'loading' };
  }

  if (!session.authenticated) {
    return { status: 'signedOut' };
  }

  if (!isOwnerWorkspaceSession(session)) {
    return { status: 'ownerSetupIncomplete' };
  }

  return {
    status: 'ownerWorkspace',
    session,
  };
}

function isOwnerWorkspaceSession(
  session: AuthenticatedSession,
): session is OwnerWorkspaceSession {
  return session.ownerProfile !== null;
}
