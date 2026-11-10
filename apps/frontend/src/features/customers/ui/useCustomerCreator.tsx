import { useRef, useState, type ReactNode } from 'react';

import { CustomerCreateModal } from './CustomerCreateModal';
import { useCreateCustomerMutation } from '../model/customerMutations';

export type CustomerCreator = {
  dialog: ReactNode;
  open: (returnFocusTarget: HTMLButtonElement | null) => void;
};

export function useCustomerCreator(): CustomerCreator {
  const [isOpen, setIsOpen] = useState(false);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const { createCustomer, isCreating } = useCreateCustomerMutation({
    onCreated: () => setIsOpen(false),
  });

  const open = (returnFocusTarget: HTMLButtonElement | null) => {
    returnFocusRef.current = returnFocusTarget;
    setIsOpen(true);
  };

  return {
    dialog: isOpen ? (
      <CustomerCreateModal
        isSubmitting={isCreating}
        onClose={() => setIsOpen(false)}
        onSubmit={createCustomer}
        returnFocusRef={returnFocusRef}
      />
    ) : null,
    open,
  };
}
