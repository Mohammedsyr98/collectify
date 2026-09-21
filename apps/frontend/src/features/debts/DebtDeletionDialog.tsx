import * as Dialog from '@radix-ui/react-dialog';
import { type RefObject } from 'react';
import { useTranslation } from 'react-i18next';

import type { DebtResponse } from '@collectify/contracts';

import {
  formatCurrencyAmount,
  useLocalization,
} from '../../shared/localization';

type DebtDeletionDialogProps = {
  debt: DebtResponse;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
  returnFocusRef: RefObject<HTMLElement | null>;
};

export function DebtDeletionDialog({
  debt,
  isDeleting,
  onClose,
  onConfirm,
  returnFocusRef,
}: DebtDeletionDialogProps) {
  const { t } = useTranslation();
  const { locale } = useLocalization();

  return (
    <Dialog.Root
      onOpenChange={(open) => {
        if (!open && !isDeleting) {
          onClose();
        }
      }}
      open
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-10 bg-foreground/25" />
        <Dialog.Content
          aria-describedby="debt-deletion-description"
          className="fixed start-1/2 top-1/2 z-10 grid w-[calc(100%-32px)] max-w-[440px] -translate-x-1/2 -translate-y-1/2 gap-5 rounded-md border border-border bg-card p-5 text-start shadow-[var(--shadow-md)]"
          onCloseAutoFocus={(event) => {
            if (!returnFocusRef.current) {
              return;
            }

            event.preventDefault();
            returnFocusRef.current.focus();
          }}
        >
          <div className="grid gap-2">
            <Dialog.Title className="m-0 text-[1.15rem] font-black leading-tight tracking-normal">
              {t('debts.delete.title')}
            </Dialog.Title>
            <Dialog.Description
              className="m-0 text-[0.86rem] leading-[1.45] text-muted-foreground"
              id="debt-deletion-description"
            >
              {t('debts.delete.description', {
                description: debt.description,
              })}
            </Dialog.Description>
          </div>

          <div className="grid gap-1 rounded-[5px] border border-border bg-background p-3">
            <span className="text-[0.72rem] font-black text-muted-foreground">
              {t('debts.delete.amountLabel')}
            </span>
            <bdi className="text-[1rem] font-black" dir="ltr">
              {formatCurrencyAmount(debt.totalAmount, debt.currency, locale)}
            </bdi>
          </div>

          <div className="grid grid-cols-2 gap-3 max-[430px]:grid-cols-1">
            <Dialog.Close asChild>
              <button
                className="min-h-11 cursor-pointer rounded-[5px] border border-border bg-background px-[18px] text-[0.84rem] font-extrabold text-foreground transition duration-150 hover:bg-muted disabled:cursor-wait disabled:opacity-70"
                disabled={isDeleting}
                type="button"
              >
                {t('debts.delete.cancel')}
              </button>
            </Dialog.Close>
            <button
              className="min-h-11 cursor-pointer rounded-[5px] border-0 bg-destructive px-[18px] text-[0.84rem] font-extrabold text-destructive-foreground transition duration-150 hover:-translate-y-px hover:brightness-95 disabled:cursor-wait disabled:opacity-70 disabled:hover:translate-y-0"
              disabled={isDeleting}
              onClick={onConfirm}
              type="button"
            >
              {t(isDeleting ? 'debts.delete.deleting' : 'debts.delete.confirm')}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
