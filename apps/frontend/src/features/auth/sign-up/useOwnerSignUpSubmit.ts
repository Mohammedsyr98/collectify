import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { OwnerSignUpRequest } from '@collectify/contracts';

import { getApiErrorDescription } from '../../../shared/api/http';
import { useToast } from '../../../shared/ui/toast/toastContext';
import { signUpOwner } from '../api/sign-up-owner';
import { sessionQueryKey } from '../session/sessionQueries';

const fallbackSignUpError = 'Unable to create owner account. Try again.';

export function useOwnerSignUpSubmit() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const signUpMutation = useMutation({
    mutationFn: signUpOwner,
    onSuccess: (session) => {
      queryClient.setQueryData(sessionQueryKey, session);
      showToast({
        variant: 'success',
        title: 'Account created',
        description: 'Your Collectify workspace is ready.',
      });
    },
    onError: (error) => {
      showToast({
        variant: 'error',
        title: 'Could not create account',
        description: getApiErrorDescription(error, fallbackSignUpError),
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
