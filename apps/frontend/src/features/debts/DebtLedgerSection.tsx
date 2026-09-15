import { ReceiptText } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import type { DebtResponse } from '@collectify/contracts';

import { DebtCard } from './DebtCard';

export function DebtLedgerSection({ debts }: { debts: DebtResponse[] }) {
  const { t } = useTranslation();

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
            <DebtCard debt={debt} key={debt.id} />
          ))}
        </div>
      )}
    </section>
  );
}
