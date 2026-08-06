import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { OwnerSignInRequest } from '@collectify/contracts';

import { isApiError, type ApiError } from '../../../shared/api/http';
import { useToast } from '../../../shared/ui/toast/toastContext';
import { signInOwner } from '../api/sign-in-owner';
import { sessionQueryKey } from '../session/sessionQueries';

const fallbackSignInError = 'Unable to sign in. Try again.';

function toApiError(error: unknown) {
  return isApiError(error) ? error : null;
}

function getSignInErrorDescription(error: ApiError | null) {
  if (!error) {
    return fallbackSignInError;
  }

  const fieldMessages = Object.values(error.fieldErrors ?? {})
    .flatMap((messages) => messages ?? [])
    .filter((message) => message.length > 0);

  if (fieldMessages.length > 0) {
    return Array.from(new Set(fieldMessages)).join(' ');
  }

  return error.message || fallbackSignInError;
}

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
      const apiError = toApiError(error);
      showToast({
        variant: 'error',
        title: 'Could not sign in',
        description: getSignInErrorDescription(apiError),
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
