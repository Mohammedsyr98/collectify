import type { Currency } from '@collectify/contracts';

export function formatCurrencyAmount(
  amount: string,
  currency: Currency,
  locale: string,
): string {
  const formatter = new Intl.NumberFormat(locale, {
    currency,
    currencyDisplay: 'symbol',
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: 'currency',
  });

  // Intl preserves decimal strings, while the TypeScript lib exposes only number and bigint here.
  return formatter.format(amount as unknown as number);
}
