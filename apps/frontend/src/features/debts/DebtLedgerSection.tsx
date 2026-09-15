import { ReceiptText } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import type { DebtResponse } from '@collectify/contracts';

import {
  formatCurrencyAmount,
  useLocalization,
} from '../../shared/localization';

export function DebtLedgerSection({ debts }: { debts: DebtResponse[] }) {
  const { t } = useTranslation();
  const { locale } = useLocalization();

  return (
    <section
      aria-label={t('debts.section.title')}
      className="grid min-h-[190px] gap-4 rounded-md border border-border bg-card p-4"
    >
      <h2 className="m-0 text-[0.95rem] font-black tracking-normal">
        {t('debts.section.title')}
      </h2>
      {debts.length === 0 ? (
        <div className="grid place-items-center gap-2 self-stretch rounded-[5px] border border-dashed border-border bg-background p-5 text-center text-muted-foreground">
          <ReceiptText aria-hidden="true" size={22} strokeWidth={2.2} />
          <p className="m-0 text-[0.82rem] font-bold">
            {t('debts.section.empty')}
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {debts.map((debt) => (
            <article
              className="grid gap-2 rounded-[5px] border border-border bg-background p-3"
              key={debt.id}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h3 className="m-0 text-[0.88rem] font-black">
                  {debt.description}
                </h3>
                {debt.scheduleItems[0]?.timing === 'dueToday' ? (
                  <span className="inline-flex rounded-[5px] border border-status-due-border bg-status-due-background px-2 py-0.5 text-[0.7rem] font-black text-status-due-foreground">
                    {t('debts.card.dueToday')}
                  </span>
                ) : null}
                {debt.scheduleItems[0]?.timing === 'overdue' ? (
                  <span className="inline-flex rounded-[5px] border border-status-overdue-border bg-status-overdue-background px-2 py-0.5 text-[0.7rem] font-black text-status-overdue-foreground">
                    {t('debts.card.overdue')}
                  </span>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[0.8rem] font-bold text-muted-foreground">
                <bdi dir="ltr">
                  {formatCurrencyAmount(debt.totalAmount, debt.currency, locale)}
                </bdi>
                <span>{t('debts.card.onePayment')}</span>
                <time dateTime={debt.scheduleItems[0]?.dueDate}>
                  {formatDebtDueDate(debt.scheduleItems[0]?.dueDate, locale)}
                </time>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function formatDebtDueDate(dueDate: string | undefined, locale: string): string {
  if (!dueDate) {
    return '';
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'long',
    timeZone: 'UTC',
  }).format(new Date(`${dueDate}T00:00:00.000Z`));
}
