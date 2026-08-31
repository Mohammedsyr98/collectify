import { useId } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';

import type {
  CustomerListCurrencyBalance,
  CustomerListItem,
} from '@collectify/contracts';

import { useAnchoredPopup } from './useAnchoredPopup';

const currencyPopoverGap = 8;
const currencyPopoverEstimatedHeight = 128;
const currencyPopoverWidth = 232;

type CurrencyBalanceAmountKey = 'overdueAmount' | 'remainingAmount';
type CurrencyBalanceVariant = 'overdueAmount' | 'remainingDebt';

type CurrencyBalanceConfig = {
  amountKey: CurrencyBalanceAmountKey;
  dialogLabelKey: string;
  emptyTextKey: string;
  multipleExtraLabelKey: string;
  singleExtraLabelKey: string;
  titleKey: string;
};

const currencyBalanceConfigs = {
  overdueAmount: {
    amountKey: 'overdueAmount',
    dialogLabelKey: 'customers.list.extraCurrencies.overdueDialogLabel',
    emptyTextKey: 'customers.list.emptyFinancial.overdueAmount',
    multipleExtraLabelKey:
      'customers.list.extraCurrencies.overdueAriaLabelPlural',
    singleExtraLabelKey: 'customers.list.extraCurrencies.overdueAriaLabel',
    titleKey: 'customers.list.columns.overdueAmount',
  },
  remainingDebt: {
    amountKey: 'remainingAmount',
    dialogLabelKey: 'customers.list.extraCurrencies.remainingDialogLabel',
    emptyTextKey: 'customers.list.emptyFinancial.remainingDebt',
    multipleExtraLabelKey:
      'customers.list.extraCurrencies.remainingAriaLabelPlural',
    singleExtraLabelKey: 'customers.list.extraCurrencies.remainingAriaLabel',
    titleKey: 'customers.list.columns.remainingDebt',
  },
} satisfies Record<CurrencyBalanceVariant, CurrencyBalanceConfig>;

type CurrencyBalancesCellProps = {
  customer: CustomerListItem;
  variant: CurrencyBalanceVariant;
};

export function CurrencyBalancesCell({
  customer,
  variant,
}: CurrencyBalancesCellProps) {
  const { t } = useTranslation();
  const popoverId = useId();
  const config = currencyBalanceConfigs[variant];
  const balances = customer.financialSummary.balancesByCurrency;
  const popover = useAnchoredPopup<HTMLButtonElement, HTMLDivElement>({
    estimatedHeight: currencyPopoverEstimatedHeight,
    gap: currencyPopoverGap,
    width: currencyPopoverWidth,
  });

  if (balances.length === 0) {
    return t(config.emptyTextKey);
  }

  const visibleBalances = balances.slice(0, 1);
  const extraBalances = balances.slice(1);
  const extraAriaLabelKey =
    extraBalances.length === 1
      ? config.singleExtraLabelKey
      : config.multipleExtraLabelKey;
  const extraCountLabelKey =
    extraBalances.length === 1
      ? 'customers.list.extraCurrencies.countSingular'
      : 'customers.list.extraCurrencies.count';

  return (
    <span className="inline-flex items-center gap-1.5">
      <span>
        {visibleBalances
          .map((balance) => formatCurrencyBalance(balance, config.amountKey))
          .join(', ')}
      </span>
      {extraBalances.length > 0 ? (
        <>
          <button
            aria-controls={popover.isOpen ? popoverId : undefined}
            aria-expanded={popover.isOpen}
            aria-haspopup="dialog"
            aria-label={t(extraAriaLabelKey, {
              count: extraBalances.length,
              name: customer.name,
            })}
            className="inline-flex min-h-7 cursor-pointer items-center justify-center rounded-[5px] border border-border bg-background px-2 text-[0.72rem] font-black text-muted-foreground transition duration-150 hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            onClick={popover.toggle}
            ref={popover.triggerRef}
            type="button"
          >
            {t(extraCountLabelKey, {
              count: extraBalances.length,
            })}
          </button>
          {popover.isOpen && popover.position
            ? createPortal(
                <div
                  aria-label={t(config.dialogLabelKey, {
                    name: customer.name,
                  })}
                  className={`fixed z-50 grid w-[232px] gap-2 rounded-[5px] border border-border bg-card p-3 text-foreground shadow-md ${
                    popover.position.placement === 'top'
                      ? '-translate-y-full'
                      : ''
                  }`}
                  id={popoverId}
                  ref={popover.popupRef}
                  role="dialog"
                  style={{
                    insetInlineStart: popover.position.insetInlineStart,
                    top: popover.position.top,
                  }}
                >
                  <h2 className="m-0 text-[0.72rem] font-black uppercase text-muted-foreground">
                    {t(config.titleKey)}
                  </h2>
                  <ul className="m-0 grid list-none gap-1 p-0">
                    {extraBalances.map((balance) => (
                      <li
                        className="grid grid-cols-[auto_1fr] items-center gap-4 text-[0.8rem]"
                        key={balance.currency}
                      >
                        <span className="font-black text-muted-foreground">
                          {balance.currency}
                        </span>
                        <span className="text-end font-black">
                          {balance[config.amountKey]}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>,
                document.body,
              )
            : null}
        </>
      ) : null}
    </span>
  );
}

function formatCurrencyBalance(
  balance: CustomerListCurrencyBalance,
  amountKey: CurrencyBalanceAmountKey,
): string {
  return `${balance[amountKey]} ${balance.currency}`;
}
