import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';

import {
  isPaymentApiErrorCode,
  type RecordPaymentRequest,
} from '@collectify/contracts';

import { resolveApiErrorDescription } from '../../shared/api/http';
import { useToast } from '../../shared/ui/toast/toastContext';
import {
  customerDetailsQueryKey,
  customerListQueryKey,
} from '../customers/customerQueries';
import { debtListQueryKey } from '../debts/ledger/debtQueries';
import {
  recordPayment as sendPayment,
  type PaymentSubmissionRequest,
} from './api/record-payment';

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
        queryClient.invalidateQueries({
          queryKey: debtListQueryKey(customerId),
        }),
        queryClient.invalidateQueries({
          queryKey: customerDetailsQueryKey(customerId),
          exact: true,
        }),
        queryClient.invalidateQueries({ queryKey: customerListQueryKey }),
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
    recordPayment: async (submission: PaymentSubmissionRequest) => {
      try {
        await mutation.mutateAsync(submission);
      } catch {
        return;
      }
    },
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
