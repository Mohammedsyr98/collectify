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
  const [payment, setPayment] = useState<PaymentHistoryItem | null>(null);
  const [failure, setFailure] = useState<PaymentDeletionFailure | null>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const historyHeadingRef = useRef<HTMLElement | null>(null);
  const closeFocusRef = useRef<HTMLElement | null>(null);
  const { deletePayment, isDeleting } = useDeletePaymentMutation({ customerId });
  const { showToast } = useToast();
  const { t } = useTranslation();
  const { locale } = useLocalization();

  const confirmDelete = async (selectedPayment: PaymentHistoryItem) => {
    try {
      const response = await deletePayment(selectedPayment.id, {
        expectedDebtVersion: selectedPayment.debtVersion,
      });
      const target = response.debt.scheduleItems.find(
        ({ id }) => id === selectedPayment.scheduleItemId,
      );

      if (!target) {
        setFailure('uncertain');
        return;
      }

      const targetLabel =
        selectedPayment.plan.type === 'onePayment'
          ? t('payments.delete.targetLabel.onePayment')
          : t('payments.delete.targetLabel.installment', {
              position: selectedPayment.plan.position,
              total: selectedPayment.plan.total,
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
      closeFocusRef.current = historyHeadingRef.current;
      setFailure(null);
      setPayment(null);
    } catch (error) {
      setFailure(getDeletionFailure(error));
    }
  };

  return {
    dialog: payment ? (
      <PaymentDeletionDialog
        failure={failure}
        fallbackFocusRef={historyHeadingRef}
        isDeleting={isDeleting}
        onClose={() => {
          closeFocusRef.current = null;
          setFailure(null);
          setPayment(null);
        }}
        onConfirm={() => confirmDelete(payment)}
        payment={payment}
        returnFocusRef={returnFocusRef}
        closeFocusRef={closeFocusRef}
      />
    ) : null,
    open: (selectedPayment, focusTargets) => {
      if (payment) return;

      returnFocusRef.current = focusTargets.returnFocusTarget;
      historyHeadingRef.current = focusTargets.afterDelete;
      closeFocusRef.current = null;
      setFailure(null);
      setPayment(selectedPayment);
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
