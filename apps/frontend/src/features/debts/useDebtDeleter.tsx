import { useRef, useState, type ReactNode } from 'react';

import type { DebtResponse } from '@collectify/contracts';

import { DebtDeletionDialog } from './ledger/DebtDeletionDialog';
import { useDeleteDebtMutation } from './debtMutations';

type DebtDeletionFocusTargets = {
  afterDelete: () => HTMLElement | null;
  returnFocusTarget: HTMLElement | null;
};

export type DebtDeleter = {
  dialog: ReactNode;
  open: (debt: DebtResponse, focusTargets: DebtDeletionFocusTargets) => void;
};

export function useDebtDeleter({ customerId }: { customerId: string }): DebtDeleter {
  const [debt, setDebt] = useState<DebtResponse | null>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const afterDeleteFocusTargetRef = useRef<DebtDeletionFocusTargets['afterDelete'] | null>(null);
  const { deleteDebt, isDeleting } = useDeleteDebtMutation({
    customerId,
    onDeleted: () => {
      returnFocusRef.current = afterDeleteFocusTargetRef.current?.() ?? null;
      setDebt(null);
    },
  });

  return {
    dialog: debt ? (
      <DebtDeletionDialog
        debt={debt}
        isDeleting={isDeleting}
        onClose={() => setDebt(null)}
        onConfirm={() => deleteDebt(debt.id, debt.description)}
        returnFocusRef={returnFocusRef}
      />
    ) : null,
    open: (selectedDebt, focusTargets) => {
      if (debt) {
        return;
      }

      returnFocusRef.current = focusTargets.returnFocusTarget;
      afterDeleteFocusTargetRef.current = focusTargets.afterDelete;
      setDebt(selectedDebt);
    },
  };
}
