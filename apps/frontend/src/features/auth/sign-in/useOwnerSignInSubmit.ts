import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import {
  isAuthApiErrorCode,
  type OwnerSignInRequest,
} from '@collectify/contracts';

import { resolveApiErrorDescription } from '../../../shared/api/http';
import { useToast } from '../../../shared/ui/toast/toastContext';
import { signInOwner } from '../api/sign-in-owner';
import { sessionQueryKey } from '../session/sessionQueries';
import { useOwnerProfileLanguageSync } from '../session/useOwnerProfileLanguageSync';

export function useOwnerSignInSubmit() {
  const queryClient = useQueryClient();
  const { i18n, t } = useTranslation();
  const { showToast } = useToast();
  const { syncOwnerProfileLanguage } = useOwnerProfileLanguageSync();

  const signInMutation = useMutation({
    mutationFn: signInOwner,
    onSuccess: async (session) => {
      await syncOwnerProfileLanguage(session.ownerProfile);
      queryClient.setQueryData(sessionQueryKey, session);
      showToast({
        variant: 'success',
        title: i18n.t('auth.toast.signIn.successTitle'),
        description: i18n.t('auth.toast.signIn.successDescription'),
      });
    },
    onError: (error) => {
      showToast({
        variant: 'error',
        title: t('auth.toast.signIn.errorTitle'),
        description: resolveApiErrorDescription(error, {
          describeKnownCode: (code) => t(`auth.errors.${code}`),
          fallbackDescription: t('errors.genericDescription'),
          isKnownCode: isAuthApiErrorCode,
        }),
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
