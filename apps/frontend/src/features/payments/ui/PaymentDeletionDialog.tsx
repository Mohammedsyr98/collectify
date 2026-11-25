import * as Dialog from '@radix-ui/react-dialog';
import { type ReactNode, type RefObject, useId, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import type { PaymentHistoryItem } from '@collectify/contracts';

import { formatCurrencyAmount, formatDateOnly, useLocalization } from '@/shared/localization';

type PaymentDeletionFailure = 'noChange' | 'stale' | 'missing' | 'uncertain';

type PaymentDeletionDialogProps = {
  closeFocusRef: RefObject<HTMLElement | null>;
  failure: PaymentDeletionFailure | null;
  fallbackFocusRef: RefObject<HTMLElement | null>;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
  payment: PaymentHistoryItem;
  returnFocusRef: RefObject<HTMLElement | null>;
};

export function PaymentDeletionDialog({
  closeFocusRef,
  failure,
  fallbackFocusRef,
  isDeleting,
  onClose,
  onConfirm,
  payment,
  returnFocusRef,
}: PaymentDeletionDialogProps) {
  const { t } = useTranslation();
  const { locale } = useLocalization();
  const keepPaymentRef = useRef<HTMLButtonElement | null>(null);
  const errorId = useId();
  const descriptionId = useId();
  const targetLabel =
    payment.plan.type === 'onePayment'
      ? t('payments.delete.targetLabel.onePayment')
      : t('payments.delete.targetLabel.installment', {
          position: payment.plan.position,
          total: payment.plan.total,
        });
  const failureMessageKey = failure
    ? {
        noChange: 'payments.delete.failure.noChange',
        stale: 'payments.delete.failure.stale',
        missing: 'payments.delete.failure.missing',
        uncertain: 'payments.delete.failure.uncertain',
      }[failure]
    : undefined;
  const isRetryBlocked = failure !== null && failure !== 'noChange';

  return (
    <Dialog.Root
      onOpenChange={(open) => {
        if (!open && !isDeleting) onClose();
      }}
      open
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-10 bg-foreground/25" />
        <Dialog.Content
          aria-describedby={descriptionId}
          aria-errormessage={failure ? errorId : undefined}
          className="fixed start-1/2 top-1/2 z-10 grid max-h-[min(90vh,820px)] w-[calc(100%-32px)] max-w-[440px] -translate-x-1/2 -translate-y-1/2 gap-5 overflow-y-auto rounded-md border border-border bg-card p-5 text-start shadow-[var(--shadow-md)]"
          onCloseAutoFocus={(event) => {
            const target = closeFocusRef.current ?? returnFocusRef.current;
            const focusTarget = target?.isConnected ? target : fallbackFocusRef.current;

            if (focusTarget?.isConnected) {
              event.preventDefault();
              focusTarget.focus();
            }
          }}
          onEscapeKeyDown={(event) => {
            if (isDeleting) event.preventDefault();
          }}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            keepPaymentRef.current?.focus();
          }}
          onPointerDownOutside={(event) => {
            if (isDeleting) event.preventDefault();
          }}
        >
          <div className="grid gap-2">
            <Dialog.Title className="m-0 text-[1.15rem] font-black leading-tight tracking-normal">
              {t('payments.delete.title')}
            </Dialog.Title>
            <Dialog.Description
              className="m-0 text-[0.86rem] leading-[1.45] text-muted-foreground"
              id={descriptionId}
            >
              {t('payments.delete.description')}
            </Dialog.Description>
          </div>

          <section className="grid gap-2 rounded-[5px] border border-border bg-background p-3">
            <h3 className="m-0 text-[0.74rem] font-black text-muted-foreground">
              {t('payments.delete.paymentToDelete')}
            </h3>
            <dl className="m-0 grid gap-2">
              <DataRow label={t('payments.delete.amount')}>
                <bdi className="text-[1rem] font-black" dir="ltr">
                  {formatCurrencyAmount(payment.amount, payment.currency, locale)}
                </bdi>
              </DataRow>
              <DataRow label={t('payments.delete.paymentDate')}>
                <time dateTime={payment.paymentDate}>
                  {formatDateOnly(payment.paymentDate, locale)}
                </time>
              </DataRow>
              <DataRow label={t('payments.delete.debt')}>
                <span className="break-words font-extrabold">{payment.debtDescription}</span>
              </DataRow>
              <DataRow label={t('payments.delete.target')}>
                <span className="break-words">{targetLabel}</span>
              </DataRow>
            </dl>
          </section>

          <section className="grid gap-2 rounded-[5px] border border-border bg-background p-3">
            <h3 className="m-0 text-[0.74rem] font-black text-muted-foreground">
              {t('payments.delete.afterDeletion')}
            </h3>
            <dl className="m-0 grid gap-2">
              <DataRow label={t('payments.delete.targetRemaining')}>
                <bdi className="font-black" dir="ltr">
                  {formatCurrencyAmount(
                    payment.maximumReplacementAmount,
                    payment.currency,
                    locale,
                  )}
                </bdi>
              </DataRow>
              <DataRow label={t('payments.delete.targetStatus')}>
                <span className="font-extrabold">
                  {t(`payments.delete.status.${payment.paymentStateAfterDeletion}`)}
                </span>
              </DataRow>
            </dl>
          </section>

          {isDeleting ? (
            <p aria-live="polite" className="m-0 text-[0.82rem] text-muted-foreground" role="status">
              {t('payments.delete.pendingAnnouncement')}
            </p>
          ) : null}
          {failureMessageKey ? (
            <p
              className="m-0 rounded-[5px] border border-status-overdue-border bg-background p-3 text-[0.82rem] text-destructive"
              id={errorId}
              role="alert"
            >
              {t(failureMessageKey)}
            </p>
          ) : null}

          <div className="grid grid-cols-2 gap-3 max-[430px]:grid-cols-1">
            <button
              className="min-h-11 cursor-pointer rounded-[5px] border border-border bg-background px-[18px] text-[0.84rem] font-extrabold text-foreground transition duration-150 hover:bg-muted disabled:cursor-wait disabled:opacity-70"
              disabled={isDeleting}
              onClick={onClose}
              ref={keepPaymentRef}
              type="button"
            >
              {t('payments.delete.keepPayment')}
            </button>
            <button
              className="min-h-11 cursor-pointer rounded-[5px] border-0 bg-destructive px-[18px] text-[0.84rem] font-extrabold text-destructive-foreground transition duration-150 hover:-translate-y-px hover:brightness-95 disabled:cursor-wait disabled:opacity-70 disabled:hover:translate-y-0"
              disabled={isDeleting || isRetryBlocked}
              onClick={onConfirm}
              type="button"
            >
              {t(isDeleting ? 'payments.delete.deleting' : 'payments.delete.confirm')}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function DataRow({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <div className="grid gap-1">
      <dt className="text-[0.7rem] font-bold text-muted-foreground">{label}</dt>
      <dd className="m-0 break-words text-[0.83rem] text-foreground">{children}</dd>
    </div>
  );
}
