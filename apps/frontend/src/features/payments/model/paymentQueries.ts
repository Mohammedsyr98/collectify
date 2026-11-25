import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';

import {
  isPaymentApiErrorCode,
  type DeletePaymentRequest,
  type ReplacePaymentRequest,
  type RecordPaymentRequest,
} from '@collectify/contracts';

import { customerCache } from '@/entities/customer';
import { debtCache } from '@/entities/debt';

import { resolveApiErrorDescription } from '@/shared/api';
import { useToast } from '@/shared/ui/toast';
import {
  recordPayment as sendPayment,
  type PaymentSubmissionRequest,
} from '../api/record-payment';
import { replacePayment as sendReplacement } from '../api/replace-payment';
import { deletePayment as sendDeletion } from '../api/delete-payment';
import { paymentTargetListQueryKey } from './paymentTargetQueries';

async function invalidatePaymentData(
  queryClient: ReturnType<typeof useQueryClient>,
  customerId: string,
): Promise<void> {
  await Promise.all([
    debtCache.invalidateCustomerDebts(queryClient, customerId),
    customerCache.invalidateCustomer(queryClient, customerId),
    customerCache.invalidatePaymentHistory(queryClient, customerId),
    queryClient.invalidateQueries({
      queryKey: paymentTargetListQueryKey(customerId),
    }),
  ]);
}

export function useRecordPaymentMutation({
  customerId,
  onRecorded,
}: {
  customerId: string;
  onRecorded?: () => void;
}) {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const previousRequestRef = useRef<RecordPaymentRequest | undefined>(undefined);
  const mutation = useMutation({
    mutationFn: (submission: PaymentSubmissionRequest) => {
      const request = preparePaymentRequest(
        submission,
        previousRequestRef.current,
      );
      previousRequestRef.current = request;

      return sendPayment(customerId, request);
    },
    onSuccess: async () => {
      await Promise.all([
        invalidatePaymentData(queryClient, customerId),
      ]);
      showToast({
        variant: 'success',
        title: t('payments.toast.record.successTitle'),
        description: t('payments.toast.record.successDescription'),
      });
      onRecorded?.();
    },
    onError: (error) => {
      showToast({
        variant: 'error',
        title: t('payments.toast.record.errorTitle'),
        description: resolveApiErrorDescription(error, {
          describeKnownCode: (code) => t(`payments.errors.${code}`),
          fallbackDescription: t('errors.genericDescription'),
          isKnownCode: isPaymentApiErrorCode,
        }),
      });
    },
  });

  return {
    resetIdempotencyKey: () => {
      previousRequestRef.current = undefined;
    },
    recordPayment: async (submission: PaymentSubmissionRequest) => {
      try {
        await mutation.mutateAsync(submission);
      } catch {
        // Error presentation is handled by the mutation toast path.
      }
    },
  };
}

export function useReplacePaymentMutation({
  customerId,
  onReplaced,
}: {
  customerId: string;
  onReplaced?: () => void;
}) {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const mutation = useMutation({
    mutationFn: ({
      paymentId,
      request,
    }: {
      paymentId: string;
      request: ReplacePaymentRequest;
    }) => sendReplacement(customerId, paymentId, request),
    onSuccess: async () => {
      await invalidatePaymentData(queryClient, customerId);
      showToast({
        variant: 'success',
        title: t('payments.toast.replace.successTitle'),
        description: t('payments.toast.replace.successDescription'),
      });
      onReplaced?.();
    },
    onError: (error) => {
      showToast({
        variant: 'error',
        title: t('payments.toast.replace.errorTitle'),
        description: resolveApiErrorDescription(error, {
          describeKnownCode: (code) => t(`payments.errors.${code}`),
          fallbackDescription: t('errors.genericDescription'),
          isKnownCode: isPaymentApiErrorCode,
        }),
      });
    },
  });

  return {
    replacePayment: async (paymentId: string, request: ReplacePaymentRequest) => {
      try {
        await mutation.mutateAsync({ paymentId, request });
      } catch {
        // Error presentation is handled by the mutation path.
      }
    },
  };
}

export function useDeletePaymentMutation({
  customerId,
}: {
  customerId: string;
}) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: ({
      paymentId,
      request,
    }: {
      paymentId: string;
      request: DeletePaymentRequest;
    }) => sendDeletion(customerId, paymentId, request),
    onSuccess: () => invalidatePaymentData(queryClient, customerId),
    onError: () => invalidatePaymentData(queryClient, customerId),
  });

  return {
    deletePayment: (paymentId: string, request: DeletePaymentRequest) =>
      mutation.mutateAsync({ paymentId, request }),
    isDeleting: mutation.isPending,
  };
}

function preparePaymentRequest(
  submission: PaymentSubmissionRequest,
  previousRequest: RecordPaymentRequest | undefined,
): RecordPaymentRequest {
  if (previousRequest && isSamePaymentSubmission(previousRequest, submission)) {
    return previousRequest;
  }

  return {
    ...submission,
    idempotencyKey: crypto.randomUUID(),
  };
}

function isSamePaymentSubmission(
  request: RecordPaymentRequest,
  submission: PaymentSubmissionRequest,
): boolean {
  return (
    request.targetScheduleItemId === submission.targetScheduleItemId &&
    request.amount === submission.amount &&
    request.paymentDate === submission.paymentDate &&
    request.expectedDebtVersion === submission.expectedDebtVersion &&
    request.note === submission.note
  );
}
