import '@testing-library/jest-dom/vitest';
import { cleanup, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { DebtResponse } from '@collectify/contracts';

import { localeStorageKey } from '../../../shared/localization';
import { renderWithAppProviders } from '../../../shared/test/render';
import { DebtLedgerSection } from '../DebtLedgerSection';
import { createDebtFixture } from './debtTestData';

const createdDebt = createDebtFixture('customer_123');

describe('DebtLedgerSection', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.lang = '';
    document.documentElement.removeAttribute('dir');
    Object.defineProperty(window.navigator, 'languages', {
      configurable: true,
      value: ['en-US'],
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('renders the empty debt state', () => {
    renderWithAppProviders(<DebtLedgerSection debts={[]} />);

    expect(screen.getByRole('region', { name: 'Debts' })).toHaveTextContent(
      'No debts yet.',
    );
  });

  it('renders a complete one-payment debt card', () => {
    renderWithAppProviders(<DebtLedgerSection debts={[createdDebt]} />);

    const debtCard = getDebtCard('Website redesign');

    expect(within(debtCard).getAllByText('$125.50')).toHaveLength(2);
    expect(within(debtCard).getByText('One payment')).toBeInTheDocument();
    expect(within(debtCard).getByText('Upcoming')).toBeInTheDocument();
    expect(within(debtCard).getByText('Paid')).toBeInTheDocument();
    expect(within(debtCard).getByText('$0.00')).toBeInTheDocument();
    expect(within(debtCard).getByText('Remaining')).toBeInTheDocument();
    expect(within(debtCard).getByText('Due')).toBeInTheDocument();
    expect(within(debtCard).getByText('September 30, 2026')).toBeInTheDocument();
    expect(
      within(debtCard).getByRole('progressbar', {
        name: 'Payment progress for Website redesign',
      }),
    ).toHaveAttribute('aria-valuenow', '0');
    expect(within(debtCard).queryByText('Due today')).not.toBeInTheDocument();
    expect(within(debtCard).queryByText('Overdue')).not.toBeInTheDocument();
  });

  it('shows only the applicable timing label on each debt', () => {
    const dueTodayDebt: DebtResponse = {
      ...createdDebt,
      id: 'debt_due_today',
      description: 'Office supplies',
      scheduleItems: [
        {
          ...createdDebt.scheduleItems[0],
          id: 'schedule_due_today',
          timing: 'dueToday',
        },
      ],
    };
    const overdueDebt: DebtResponse = {
      ...createdDebt,
      id: 'debt_overdue',
      description: 'Storefront repair',
      scheduleItems: [
        {
          ...createdDebt.scheduleItems[0],
          id: 'schedule_overdue',
          timing: 'overdue',
        },
      ],
    };

    renderWithAppProviders(
      <DebtLedgerSection debts={[dueTodayDebt, overdueDebt]} />,
    );

    const dueTodayCard = getDebtCard('Office supplies');
    const overdueCard = getDebtCard('Storefront repair');

    expect(within(dueTodayCard).getByText('Due today')).toBeInTheDocument();
    expect(within(dueTodayCard).queryByText('Overdue')).not.toBeInTheDocument();
    expect(within(dueTodayCard).queryByText('Upcoming')).not.toBeInTheDocument();
    expect(within(overdueCard).getByText('Overdue')).toBeInTheDocument();
    expect(within(overdueCard).queryByText('Due today')).not.toBeInTheDocument();
    expect(within(overdueCard).queryByText('Upcoming')).not.toBeInTheDocument();
  });

  it('localizes Arabic debt details and isolates the money amount', () => {
    window.localStorage.setItem(localeStorageKey, 'ar');
    const overdueDebt: DebtResponse = {
      ...createdDebt,
      scheduleItems: [
        {
          ...createdDebt.scheduleItems[0],
          id: 'schedule_overdue_ar',
          timing: 'overdue',
        },
      ],
    };

    renderWithAppProviders(<DebtLedgerSection debts={[overdueDebt]} />);

    const debtCard = getDebtCard('Website redesign');
    const localizedAmount = new Intl.NumberFormat('ar', {
      currency: 'USD',
      currencyDisplay: 'symbol',
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
      style: 'currency',
    }).format(125.5);
    const localizedDueDate = new Intl.DateTimeFormat('ar', {
      dateStyle: 'long',
      timeZone: 'UTC',
    }).format(new Date('2026-09-30T00:00:00.000Z'));

    expect(within(debtCard).getByText('دفعة واحدة')).toBeInTheDocument();
    expect(within(debtCard).getByText(localizedDueDate)).toBeInTheDocument();
    expect(within(debtCard).getByText('متأخر')).toBeInTheDocument();

    expect(within(debtCard).getByText('المدفوع')).toBeInTheDocument();
    expect(within(debtCard).getByText('المتبقي')).toBeInTheDocument();

    const isolatedAmount = debtCard.querySelector('bdi[dir="ltr"]');

    expect(isolatedAmount?.textContent).toBe(localizedAmount);
    expect(isolatedAmount).toHaveAttribute('dir', 'ltr');
  });

  it('localizes the payment plan and timing label in Turkish', () => {
    window.localStorage.setItem(localeStorageKey, 'tr');
    const dueTodayDebt: DebtResponse = {
      ...createdDebt,
      scheduleItems: [
        {
          ...createdDebt.scheduleItems[0],
          id: 'schedule_due_today_tr',
          timing: 'dueToday',
        },
      ],
    };

    renderWithAppProviders(<DebtLedgerSection debts={[dueTodayDebt]} />);

    const debtCard = getDebtCard('Website redesign');

    expect(within(debtCard).getByText('Tek ödeme')).toBeInTheDocument();
    expect(within(debtCard).getByText('Vadesi bugün')).toBeInTheDocument();
  });
});

function getDebtCard(description: string): HTMLElement {
  const debtCard = screen.getByRole('heading', { name: description }).closest('article');

  if (!debtCard) {
    throw new Error('Expected the debt description to belong to a debt card.');
  }

  return debtCard;
}
