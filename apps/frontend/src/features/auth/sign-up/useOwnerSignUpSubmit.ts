import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import {
  isAuthApiErrorCode,
  type OwnerSignUpRequest,
} from '@collectify/contracts';

import { resolveApiErrorDescription } from '../../../shared/api/http';
import { useToast } from '../../../shared/ui/toast/toastContext';
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
        description: resolveApiErrorDescription(error, {
          describeKnownCode: (code) => t(`auth.errors.${code}`),
          fallbackDescription: t('errors.genericDescription'),
          isKnownCode: isAuthApiErrorCode,
        }),
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
