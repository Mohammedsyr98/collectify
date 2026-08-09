import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import type { OwnerSignInRequest } from '@collectify/contracts';

import { getApiErrorDescription } from '../../../shared/api/http';
import { useToast } from '../../../shared/ui/toast/toastContext';
import { signInOwner } from '../api/sign-in-owner';
import { sessionQueryKey } from '../session/sessionQueries';

export function useOwnerSignInSubmit() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const { showToast } = useToast();

  const signInMutation = useMutation({
    mutationFn: signInOwner,
    onSuccess: (session) => {
      queryClient.setQueryData(sessionQueryKey, session);
      showToast({
        variant: 'success',
        title: t('toast.auth.signIn.successTitle'),
        description: t('toast.auth.signIn.successDescription'),
      });
    },
    onError: (error) => {
      showToast({
        variant: 'error',
        title: t('toast.auth.signIn.errorTitle'),
        description: getApiErrorDescription(
          error,
          t('toast.auth.signIn.errorDescription'),
        ),
      });
    },
  });

  function submit(request: OwnerSignInRequest) {
    signInMutation.mutate(request);
  }

  return {
    isSubmitting: signInMutation.isPending,
    submit,
  };
}
