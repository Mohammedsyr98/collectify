import { useRef, useState, type ReactNode } from 'react';

import type { PaymentHistoryItem } from '@collectify/contracts';

import { useDeletePaymentMutation } from '../model/paymentQueries';
import { PaymentDeletionDialog } from './PaymentDeletionDialog';

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
  const focusTargetRef = useRef<HTMLElement | null>(null);
  const historyHeadingRef = useRef<HTMLElement | null>(null);
  const { deletePayment, isDeleting } = useDeletePaymentMutation({
    customerId,
    onDeleted: () => {
      focusTargetRef.current = historyHeadingRef.current;
      setSelectedPayment(null);
    },
  });

  return {
    dialog: selectedPayment ? (
      <PaymentDeletionDialog
        fallbackFocusRef={historyHeadingRef}
        isDeleting={isDeleting}
        onClose={() => {
          setSelectedPayment(null);
        }}
        onConfirm={() =>
          deletePayment(selectedPayment.id, {
            expectedDebtVersion: selectedPayment.debtVersion,
          })
        }
        payment={selectedPayment}
        focusTargetRef={focusTargetRef}
      />
    ) : null,
    open: (paymentToOpen, focusTargets) => {
      if (selectedPayment) return;

      focusTargetRef.current = focusTargets.returnFocusTarget;
      historyHeadingRef.current = focusTargets.afterDelete;
      setSelectedPayment(paymentToOpen);
    },
  };
}
