import { useState, type ReactNode } from 'react';

import type { DebtResponse, PaymentTarget } from '@collectify/contracts';

import { PaymentDrawer } from './editor/PaymentDrawer';
import { useRecordPaymentMutation } from './paymentQueries';

export type PaymentRecordingTarget = {
  debt: DebtResponse;
  scheduleItemId: string;
};

export type PaymentRecorder = {
  dialog: ReactNode;
  open: (target: PaymentRecordingTarget | undefined, returnFocusTarget: HTMLElement | null) => void;
};

type PaymentRecorderSessionState = {
  initialTarget?: PaymentTarget;
  returnFocusTarget: HTMLElement | null;
};

export function usePaymentRecorder({
  customerId,
  customerName,
}: {
  customerId: string;
  customerName?: string;
}): PaymentRecorder {
  const [session, setSession] = useState<PaymentRecorderSessionState | null>(null);
  const { recordPayment, resetIdempotencyKey } = useRecordPaymentMutation({
    customerId,
    onRecorded: () => setSession(null),
  });

  return {
    dialog: session ? (
      <PaymentDrawer
        customerId={customerId}
        customerName={customerName}
        initialTarget={session.initialTarget}
        onSubmit={recordPayment}
        onClose={() => setSession(null)}
        returnFocusTarget={session.returnFocusTarget}
      />
    ) : null,
    open: (target, returnFocusTarget) => {
      const initialTarget = toPaymentTarget(target);
      if (target && !initialTarget) return;
      if (session) return;

      resetIdempotencyKey();
      setSession((currentSession) => currentSession ?? { initialTarget, returnFocusTarget });
    },
  };
}

function toPaymentTarget(
  target: PaymentRecordingTarget | undefined,
): PaymentTarget | undefined {
  if (!target) return undefined;

  const { debt, scheduleItemId } = target;
  const scheduleItem = debt.scheduleItems.find(({ id }) => id === scheduleItemId);

  if (!scheduleItem || scheduleItem.paymentState === 'paid') {
    return undefined;
  }

  return {
    scheduleItemId: scheduleItem.id,
    debtId: debt.id,
    debtDescription: debt.description,
    currency: debt.currency,
    debtVersion: debt.version,
    amount: scheduleItem.amount,
    remainingAmount: scheduleItem.remainingAmount,
    dueDate: scheduleItem.dueDate,
    timing: scheduleItem.timing,
    paymentState: scheduleItem.paymentState,
    plan:
      debt.paymentPlanType === 'installment'
        ? { type: 'installment', position: scheduleItem.position }
        : { type: 'onePayment' },
  };
}
