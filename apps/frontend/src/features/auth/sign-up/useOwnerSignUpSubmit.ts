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
import { useOwnerProfileLanguageSync } from '../session/useOwnerProfileLanguageSync';

export function useOwnerSignUpSubmit() {
  const queryClient = useQueryClient();
  const { i18n, t } = useTranslation();
  const { showToast } = useToast();
  const { syncOwnerProfileLanguage } = useOwnerProfileLanguageSync();

  const signUpMutation = useMutation({
    mutationFn: signUpOwner,
    onSuccess: async (session) => {
      await syncOwnerProfileLanguage(session.ownerProfile);
      queryClient.setQueryData(sessionQueryKey, session);
      showToast({
        variant: 'success',
        title: i18n.t('auth.toast.signUp.successTitle'),
        description: i18n.t('auth.toast.signUp.successDescription'),
      });
    },
    onError: (error) => {
      showToast({
        variant: 'error',
        title: t('auth.toast.signUp.errorTitle'),
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
