import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import type { SessionResponse } from '@collectify/contracts';

import { getApiErrorDescription } from '../../../shared/api/http';
import { useToast } from '../../../shared/ui/toast/toastContext';
import { signOutOwner } from '../api/sign-out-owner';
import { sessionQueryKey } from '../session/sessionQueries';

const signedOutSession: SessionResponse = {
  authenticated: false,
  user: null,
  ownerProfile: null,
};

export function useOwnerSignOut() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const { showToast } = useToast();

  const signOutMutation = useMutation({
    mutationFn: signOutOwner,
    onSuccess: async () => {
      queryClient.setQueryData(sessionQueryKey, signedOutSession);
      await queryClient.invalidateQueries({ queryKey: sessionQueryKey });
    },
    onError: (error) => {
      showToast({
        variant: 'error',
        title: t('app.workspace.signOutErrorTitle'),
        description: getApiErrorDescription(
          error,
          t('errors.genericDescription'),
        ),
      });
    },
  });

  function signOut() {
    signOutMutation.mutate();
  }

  return {
    isSigningOut: signOutMutation.isPending,
    signOut,
  };
}
