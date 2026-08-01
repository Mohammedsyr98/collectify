import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { OwnerSignUpRequest } from '@collectify/contracts';

import { isApiError, type ApiError } from '../../../shared/api/http';
import { useToast } from '../../../shared/ui/toast/toastContext';
import { signUpOwner } from '../api/sign-up-owner';
import { sessionQueryKey } from '../session/sessionQueries';

const fallbackSignUpError = 'Unable to create owner account. Try again.';

function toApiError(error: unknown) {
  return isApiError(error) ? error : null;
}

function getSignUpErrorDescription(error: ApiError | null) {
  if (!error) {
    return fallbackSignUpError;
  }

  const fieldMessages = Object.values(error.fieldErrors ?? {})
    .flatMap((messages) => messages ?? [])
    .filter((message) => message.length > 0);

  if (fieldMessages.length > 0) {
    return Array.from(new Set(fieldMessages)).join(' ');
  }

  return error.message || fallbackSignUpError;
}

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
      const apiError = toApiError(error);
      showToast({
        variant: 'error',
        title: 'Could not create account',
        description: getSignUpErrorDescription(apiError),
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
