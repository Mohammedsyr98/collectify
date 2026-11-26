import { useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import {
  paymentApiErrorCode,
  type PaymentHistoryItem,
} from '@collectify/contracts';

import { isApiError } from '@/shared/api';
import { formatCurrencyAmount, useLocalization } from '@/shared/localization';
import { useToast } from '@/shared/ui/toast';

import { useDeletePaymentMutation } from '../model/paymentQueries';
import { PaymentDeletionDialog } from './PaymentDeletionDialog';

type PaymentDeletionFailure = 'noChange' | 'stale' | 'missing' | 'uncertain';

type PaymentDeletionFocusTargets = {
  returnFocusTarget: HTMLElement | null;
  afterDelete: HTMLElement | null;
};

export type PaymentDeleter = {
  dialog: ReactNode;
  open: (payment: PaymentHistoryItem, focusTargets: PaymentDeletionFocusTargets) => void;
};

export function usePaymentDeleter({ customerId }: { customerId: string }): PaymentDeleter {
  const [selectedPayment, setSelectedPayment] = useState<PaymentHistoryItem | null>(null);
  const [failure, setFailure] = useState<PaymentDeletionFailure | null>(null);
  const focusTargetRef = useRef<HTMLElement | null>(null);
  const historyHeadingRef = useRef<HTMLElement | null>(null);
  const { deletePayment, isDeleting } = useDeletePaymentMutation({ customerId });
  const { showToast } = useToast();
  const { t } = useTranslation();
  const { locale } = useLocalization();

  const confirmDelete = async (paymentToDelete: PaymentHistoryItem) => {
    try {
      const response = await deletePayment(paymentToDelete.id, {
        expectedDebtVersion: paymentToDelete.debtVersion,
      });
      const target = response.debt.scheduleItems.find(
        ({ id }) => id === paymentToDelete.scheduleItemId,
      );

      if (!target) {
        setFailure('uncertain');
        return;
      }

      const targetLabel =
        paymentToDelete.plan.type === 'onePayment'
          ? t('payments.delete.targetLabel.onePayment')
          : t('payments.delete.targetLabel.installment', {
              position: paymentToDelete.plan.position,
              total: paymentToDelete.plan.total,
            });
      const statusLabel = t(`payments.delete.status.${target.paymentState}`);

      showToast({
        variant: 'success',
        title: t('payments.delete.toast.successTitle'),
        description: t('payments.delete.toast.successDescription', {
          target: targetLabel,
          remaining: formatCurrencyAmount(target.remainingAmount, response.debt.currency, locale),
          status: statusLabel,
        }),
      });
      focusTargetRef.current = historyHeadingRef.current;
      setFailure(null);
      setSelectedPayment(null);
    } catch (error) {
      setFailure(getDeletionFailure(error));
    }
  };

  return {
    dialog: selectedPayment ? (
      <PaymentDeletionDialog
        failure={failure}
        fallbackFocusRef={historyHeadingRef}
        isDeleting={isDeleting}
        onClose={() => {
          setFailure(null);
          setSelectedPayment(null);
        }}
        onConfirm={() => confirmDelete(selectedPayment)}
        payment={selectedPayment}
        focusTargetRef={focusTargetRef}
      />
    ) : null,
    open: (paymentToOpen, focusTargets) => {
      if (selectedPayment) return;

      focusTargetRef.current = focusTargets.returnFocusTarget;
      historyHeadingRef.current = focusTargets.afterDelete;
      setFailure(null);
      setSelectedPayment(paymentToOpen);
    },
  };
}

function getDeletionFailure(error: unknown): PaymentDeletionFailure {
  if (!isApiError(error) || error.status < 200 || error.status >= 500) {
    return 'uncertain';
  }

  if (error.status >= 200 && error.status < 300) {
    return 'uncertain';
  }

  if (error.code === paymentApiErrorCode.paymentDebtVersionConflict) {
    return 'stale';
  }

  if (error.code === paymentApiErrorCode.paymentNotFound) {
    return 'missing';
  }

  return 'noChange';
}
