import { useId, useState } from 'react';
import { CalendarDays, ChevronDown, ChevronUp, Pencil, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import type { DebtResponse } from '@collectify/contracts';

import {
  formatCurrencyAmount,
  formatDateOnly,
  useLocalization,
} from '../../../shared/localization';
import { AnchoredMenu } from '../../../shared/ui/anchored-menu/AnchoredMenu';

export function DebtCard({
  debt,
  onEdit,
  onDelete,
}: {
  debt: DebtResponse;
  onDelete?: (debt: DebtResponse, trigger: HTMLButtonElement | null) => void;
  onEdit?: (debt: DebtResponse, trigger: HTMLButtonElement | null) => void;
}) {
  const { t } = useTranslation();
  const { locale } = useLocalization();
  const actionItems = [
    {
      icon: <Pencil aria-hidden="true" size={15} strokeWidth={2.5} />,
      id: 'edit-debt',
      label: t('debts.card.actions.edit'),
      onSelect: (trigger: HTMLButtonElement | null) => onEdit?.(debt, trigger),
    },
    {
      icon: <Trash2 aria-hidden="true" size={15} strokeWidth={2.5} />,
      id: 'delete-debt',
      label: t('debts.card.actions.delete'),
      onSelect: (trigger: HTMLButtonElement | null) => onDelete?.(debt, trigger),
    },
  ];

  return (
    <article className="relative grid gap-3 rounded-[5px] border border-border bg-background p-3">
      <header className="grid gap-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h3 className="m-0 text-[0.88rem] font-black">{debt.description}</h3>
          <div className="flex items-center gap-2">
            <bdi className="text-[0.9rem] font-black" dir="ltr">
              {formatCurrencyAmount(debt.totalAmount, debt.currency, locale)}
            </bdi>
            <AnchoredMenu
              items={actionItems}
              menuLabel={t('debts.card.actions.menuLabel', {
                description: debt.description,
              })}
              triggerLabel={t('debts.card.actions.openMenu', {
                description: debt.description,
              })}
            />
          </div>
        </div>
      </header>

      {debt.paymentPlanType === 'onePayment' ? (
        <OnePaymentSummary debt={debt} locale={locale} />
      ) : (
        <InstallmentSummary debt={debt} locale={locale} />
      )}
    </article>
  );
}

function InstallmentSummary({
  debt,
  locale,
}: {
  debt: Extract<DebtResponse, { paymentPlanType: 'installment' }>;
  locale: string;
}) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const contentId = useId();
  const overdueCount = debt.scheduleItems.filter(
    (scheduleItem) => scheduleItem.timing === 'overdue',
  ).length;
  const dueTodayCount = debt.scheduleItems.filter(
    (scheduleItem) => scheduleItem.timing === 'dueToday',
  ).length;

  return (
    <div className="grid gap-3 border-t border-border pt-3 text-[0.8rem] font-bold text-muted-foreground">
      <div className="flex flex-wrap items-center gap-2">
        <span>{t('debts.card.installmentCount', { count: debt.scheduleItems.length })}</span>
        {overdueCount > 0 ? (
          <span className="rounded-[5px] border border-status-overdue-border bg-status-overdue-background px-2 py-0.5 text-[0.7rem] font-black text-status-overdue-foreground">
            {t('debts.card.overdueInstallmentCount', { count: overdueCount })}
          </span>
        ) : null}
        {dueTodayCount > 0 ? (
          <span className="rounded-[5px] border border-status-due-border bg-status-due-background px-2 py-0.5 text-[0.7rem] font-black text-status-due-foreground">
            {t('debts.card.dueTodayInstallmentCount', { count: dueTodayCount })}
          </span>
        ) : null}
      </div>

      <PaymentProgress debt={debt} locale={locale} />

      <button
        aria-controls={contentId}
        aria-expanded={expanded}
        className="inline-flex w-fit items-center gap-1 rounded-[5px] border border-border px-2 py-1 text-[0.75rem] font-black text-foreground transition hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        onClick={() => setExpanded((value) => !value)}
        type="button"
      >
        <span>
          {t(expanded ? 'debts.card.hideInstallments' : 'debts.card.viewInstallments')}
        </span>
        {expanded ? (
          <ChevronUp aria-hidden="true" size={15} strokeWidth={2.5} />
        ) : (
          <ChevronDown aria-hidden="true" size={15} strokeWidth={2.5} />
        )}
      </button>

      {expanded ? (
        <div
          aria-label={t('debts.card.installmentScheduleLabel', {
            description: debt.description,
          })}
          className="grid gap-2"
          id={contentId}
          role="region"
        >
          <ol className="m-0 grid list-none gap-2 p-0">
            {debt.scheduleItems.map((scheduleItem) => (
              <li
                className="grid gap-1 rounded-[5px] border border-border bg-background p-2"
                key={scheduleItem.id}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[0.75rem] font-black text-muted-foreground">
                    {t('debts.card.installmentNumber', {
                      number: scheduleItem.position,
                    })}
                  </span>
                  <bdi className="text-[0.85rem] font-black" dir="ltr">
                    {formatCurrencyAmount(scheduleItem.amount, debt.currency, locale)}
                  </bdi>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-[0.75rem] font-bold text-muted-foreground">
                  <CalendarDays aria-hidden="true" size={14} strokeWidth={2.4} />
                  <time dateTime={scheduleItem.dueDate}>
                    {formatDateOnly(scheduleItem.dueDate, locale)}
                  </time>
                  <TimingBadge timing={scheduleItem.timing} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <FinancialMetric
                    currency={debt.currency}
                    label={t('debts.card.paid')}
                    locale={locale}
                    value={scheduleItem.paidAmount}
                  />
                  <FinancialMetric
                    currency={debt.currency}
                    label={t('debts.card.remaining')}
                    locale={locale}
                    value={scheduleItem.remainingAmount}
                  />
                </div>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </div>
  );
}

function OnePaymentSummary({
  debt,
  locale,
}: {
  debt: Extract<DebtResponse, { paymentPlanType: 'onePayment' }>;
  locale: string;
}) {
  const { t } = useTranslation();
  const scheduleItem = debt.scheduleItems[0];

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2 text-[0.8rem] font-bold text-muted-foreground">
        <span>{t('debts.card.onePayment')}</span>
        <TimingBadge timing={scheduleItem?.timing} />
      </div>

      <PaymentProgress debt={debt} locale={locale} />

      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3 text-[0.8rem] font-bold text-muted-foreground">
        <CalendarDays aria-hidden="true" size={16} strokeWidth={2.4} />
        <span>{t('debts.card.dueDate')}</span>
        <time dateTime={scheduleItem?.dueDate}>
          {formatDateOnly(scheduleItem?.dueDate, locale)}
        </time>
      </div>
    </>
  );
}

function PaymentProgress({
  debt,
  locale,
}: {
  debt: DebtResponse;
  locale: string;
}) {
  const { t } = useTranslation();
  const paidPercentage = resolvePaidPercentage(debt);

  return (
    <div className="grid gap-3 border-t border-border pt-3">
      <div className="grid grid-cols-2 gap-3">
        <FinancialMetric
          currency={debt.currency}
          label={t('debts.card.paid')}
          locale={locale}
          value={debt.paidAmount}
        />
        <FinancialMetric
          currency={debt.currency}
          label={t('debts.card.remaining')}
          locale={locale}
          value={debt.remainingAmount}
        />
      </div>
      <div className="grid grid-cols-[1fr_auto] items-center gap-2">
        <div
          aria-label={t('debts.card.paymentProgress', {
            description: debt.description,
          })}
          aria-valuemax={100}
          aria-valuemin={0}
          aria-valuenow={paidPercentage}
          className="h-1.5 overflow-hidden rounded-full bg-muted"
          role="progressbar"
        >
          <span
            className="block h-full rounded-full bg-primary transition-[width] duration-200"
            style={{ width: `${paidPercentage}%` }}
          />
        </div>
        <span className="text-[0.72rem] font-black text-muted-foreground">{paidPercentage}%</span>
      </div>
    </div>
  );
}

function resolvePaidPercentage(debt: DebtResponse): number {
  const totalAmount = Number(debt.totalAmount);
  const paidAmount = Number(debt.paidAmount);

  if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
    return 0;
  }

  return Math.round(
    Math.min(1, Math.max(0, paidAmount / totalAmount)) * 100,
  );
}

function FinancialMetric({
  currency,
  label,
  locale,
  value,
}: {
  currency: DebtResponse['currency'];
  label: string;
  locale: string;
  value: string;
}) {
  return (
    <div className="grid gap-1">
      <span className="text-[0.68rem] font-black text-muted-foreground">{label}</span>
      <bdi className="text-[0.9rem] font-black" dir="ltr">
        {formatCurrencyAmount(value, currency, locale)}
      </bdi>
    </div>
  );
}

function TimingBadge({
  timing,
}: {
  timing: DebtResponse['scheduleItems'][number]['timing'] | undefined;
}) {
  const { t } = useTranslation();

  if (timing === 'dueToday') {
    return (
      <span className="inline-flex rounded-[5px] border border-status-due-border bg-status-due-background px-2 py-0.5 text-[0.7rem] font-black text-status-due-foreground">
        {t('debts.card.dueToday')}
      </span>
    );
  }

  if (timing === 'overdue') {
    return (
      <span className="inline-flex rounded-[5px] border border-status-overdue-border bg-status-overdue-background px-2 py-0.5 text-[0.7rem] font-black text-status-overdue-foreground">
        {t('debts.card.overdue')}
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-[5px] border border-border bg-muted px-2 py-0.5 text-[0.7rem] font-black text-muted-foreground">
      {t('debts.card.upcoming')}
    </span>
  );
}
