import { useState, type ReactNode } from 'react';

import type { DebtResponse, PaymentHistoryItem, PaymentTarget } from '@collectify/contracts';

import { PaymentDrawer } from './editor/PaymentDrawer';
import {
  useRecordPaymentMutation,
  useReplacePaymentMutation,
} from '../model/paymentQueries';

export type PaymentRecordingTarget = {
  debt: DebtResponse;
  scheduleItemId: string;
};

export type PaymentEditor = {
  dialog: ReactNode;
  openForRecord: (
    target: PaymentRecordingTarget | undefined,
    returnFocusTarget: HTMLElement | null,
  ) => void;
  openForEdit: (payment: PaymentHistoryItem, returnFocusTarget: HTMLElement | null) => void;
};

type PaymentEditorSessionState =
  | {
      kind: 'record';
      initialTarget?: PaymentTarget;
      returnFocusTarget: HTMLElement | null;
    }
  | {
      kind: 'edit';
      payment: PaymentHistoryItem;
      returnFocusTarget: HTMLElement | null;
    };

export function usePaymentEditor({
  customerId,
  customerName,
}: {
  customerId: string;
  customerName?: string;
}): PaymentEditor {
  const [session, setSession] = useState<PaymentEditorSessionState | null>(null);
  const { recordPayment, resetIdempotencyKey } = useRecordPaymentMutation({
    customerId,
    onRecorded: () => setSession(null),
  });
  const { replacePayment } = useReplacePaymentMutation({
    customerId,
    onReplaced: () => setSession(null),
  });

  return {
    dialog: session ? (
      session.kind === 'record' ? (
        <PaymentDrawer
          customerId={customerId}
          customerName={customerName}
          initialTarget={session.initialTarget}
          onSubmit={recordPayment}
          onClose={() => setSession(null)}
          returnFocusTarget={session.returnFocusTarget}
        />
      ) : (
        <PaymentDrawer
          customerId={customerId}
          customerName={customerName}
          mode="edit"
          onSubmit={(request) => replacePayment(session.payment.id, request)}
          onClose={() => setSession(null)}
          payment={session.payment}
          returnFocusTarget={session.returnFocusTarget}
        />
      )
    ) : null,
    openForRecord: (target, returnFocusTarget) => {
      const initialTarget = toPaymentTarget(target);
      if (target && !initialTarget) return;
      if (session) return;

      resetIdempotencyKey();
      setSession(
        (currentSession) =>
          currentSession ?? { kind: 'record', initialTarget, returnFocusTarget },
      );
    },
    openForEdit: (payment, returnFocusTarget) => {
      if (session) return;
      setSession({
        kind: 'edit',
        payment,
        returnFocusTarget,
      });
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
