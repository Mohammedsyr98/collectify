import { useRef, useState, type ReactNode } from 'react';

import type { DebtResponse } from '@collectify/contracts';

import { DebtDrawer } from './editor/DebtDrawer';
import { useReplaceDebtMutation } from '../model/debtMutations';

export type DebtEditor = {
  dialog: ReactNode;
  open: (debt: DebtResponse, returnFocusTarget: HTMLElement | null) => void;
};

export function useDebtEditor({ customerId }: { customerId: string }): DebtEditor {
  const [debt, setDebt] = useState<DebtResponse | null>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const { isReplacing, replaceDebt } = useReplaceDebtMutation({
    customerId,
    onReplaced: () => setDebt(null),
  });

  return {
    dialog: debt ? (
      <DebtDrawer
        debt={debt}
        isSubmitting={isReplacing}
        mode="edit"
        onClose={() => setDebt(null)}
        onSubmit={(request) => replaceDebt(debt.id, request)}
        returnFocusRef={returnFocusRef}
      />
    ) : null,
    open: (selectedDebt, returnFocusTarget) => {
      if (debt) {
        return;
      }

      returnFocusRef.current = returnFocusTarget;
      setDebt(selectedDebt);
    },
  };
}
