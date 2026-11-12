import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { sessionCache } from '@/entities/session';
import { getApiErrorDescription } from '@/shared/api';
import { useToast } from '@/shared/ui/toast';
import { signOutOwner } from '../api/sign-out-owner';

export function useOwnerSignOut() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const { showToast } = useToast();

  const signOutMutation = useMutation({
    mutationFn: signOutOwner,
    onSuccess: async () => {
      sessionCache.setSignedOut(queryClient);
      await sessionCache.refresh(queryClient);
    },
    onError: (error) => {
      showToast({
        variant: 'error',
        title: t('auth.toast.signOut.errorTitle'),
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
