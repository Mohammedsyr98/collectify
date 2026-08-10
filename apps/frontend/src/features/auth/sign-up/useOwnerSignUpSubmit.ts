import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import type { OwnerSignUpRequest } from '@collectify/contracts';

import { useToast } from '../../../shared/ui/toast/toastContext';
import { getOwnerSignUpApiErrorDescription } from '../api/auth-api-error-description';
import { signUpOwner } from '../api/sign-up-owner';
import { sessionQueryKey } from '../session/sessionQueries';

export function useOwnerSignUpSubmit() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const { showToast } = useToast();

  const signUpMutation = useMutation({
    mutationFn: signUpOwner,
    onSuccess: (session) => {
      queryClient.setQueryData(sessionQueryKey, session);
      showToast({
        variant: 'success',
        title: t('toast.auth.signUp.successTitle'),
        description: t('toast.auth.signUp.successDescription'),
      });
    },
    onError: (error) => {
      showToast({
        variant: 'error',
        title: t('toast.auth.signUp.errorTitle'),
        description: getOwnerSignUpApiErrorDescription(
          error,
          t('toast.auth.signUp.errorDescription'),
          t,
        ),
      });
    },
  });

  function submit(request: OwnerSignUpRequest) {
    signUpMutation.mutate(request);
  }

  return {
    isSubmitting: signUpMutation.isPending,
    submit,
  };
}
