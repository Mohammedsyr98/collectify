import { useRef, useState, type ReactNode } from 'react';

import type { Currency } from '@collectify/contracts';

import { DebtDrawer } from './editor/DebtDrawer';
import { useCreateDebtMutation } from '../model/debtMutations';

export type DebtCreator = {
  dialog: ReactNode;
  open: (returnFocusTarget: HTMLElement | null) => void;
};

export function useDebtCreator({
  customerId,
  defaultCurrency,
}: {
  customerId: string;
  defaultCurrency: Currency;
}): DebtCreator {
  const [isOpen, setIsOpen] = useState(false);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const { createDebt, isCreating } = useCreateDebtMutation({
    customerId,
    onCreated: () => setIsOpen(false),
  });

  return {
    dialog: isOpen ? (
      <DebtDrawer
        defaultCurrency={defaultCurrency}
        isSubmitting={isCreating}
        onClose={() => setIsOpen(false)}
        onSubmit={createDebt}
        returnFocusRef={returnFocusRef}
      />
    ) : null,
    open: (returnFocusTarget) => {
      returnFocusRef.current = returnFocusTarget;
      setIsOpen(true);
    },
  };
}
