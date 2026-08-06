import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { OwnerSignInRequest } from '@collectify/contracts';

import { getApiErrorDescription } from '../../../shared/api/http';
import { useToast } from '../../../shared/ui/toast/toastContext';
import { signInOwner } from '../api/sign-in-owner';
import { sessionQueryKey } from '../session/sessionQueries';

const fallbackSignInError = 'Unable to sign in. Try again.';

export function useOwnerSignInSubmit() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const signInMutation = useMutation({
    mutationFn: signInOwner,
    onSuccess: (session) => {
      queryClient.setQueryData(sessionQueryKey, session);
      showToast({
        variant: 'success',
        title: 'Signed in',
        description: 'Welcome back to Collectify.',
      });
    },
    onError: (error) => {
      showToast({
        variant: 'error',
        title: 'Could not sign in',
        description: getApiErrorDescription(error, fallbackSignInError),
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
