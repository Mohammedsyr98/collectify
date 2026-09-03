import '@testing-library/jest-dom/vitest';
import { cleanup, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { renderWithAppProviders } from '../../../shared/test/render';
import { CurrencyBalancesCell } from '../list/CurrencyBalancesCell';
import {
  customerList,
  financialCustomer,
  resetCustomerTestEnvironment,
} from './customerTestData';

describe('CurrencyBalancesCell', () => {
  beforeEach(() => {
    resetCustomerTestEnvironment();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders the empty remaining debt text when a customer has no balances', () => {
    renderWithAppProviders(
      <CurrencyBalancesCell
        customer={customerList.items[0]}
        variant="remainingDebt"
      />,
    );

    expect(screen.getByText('No debt')).toBeInTheDocument();
  });

  it('opens and closes additional remaining debt currencies', async () => {
    const user = userEvent.setup();
    renderWithAppProviders(
      <>
        <h1>Customers</h1>
        <CurrencyBalancesCell
          customer={financialCustomer}
          variant="remainingDebt"
        />
      </>,
    );

    expect(screen.getByText(/125\.50 USD/)).toBeInTheDocument();
    expect(screen.queryByText(/80\.00 EUR/)).not.toBeInTheDocument();
    expect(screen.queryByText(/12\.30 TRY/)).not.toBeInTheDocument();

    const remainingExtraCurrencies = screen.getByRole('button', {
      name: 'Show 2 more remaining debt currencies for South Ledger',
    });
    expect(remainingExtraCurrencies).toHaveTextContent('+2 currencies');

    await user.click(remainingExtraCurrencies);

    const currencyPopover = await screen.findByRole('dialog', {
      name: 'Remaining debt currencies for South Ledger',
    });
    expect(
      within(currencyPopover).getByRole('heading', { name: 'Remaining debt' }),
    ).toBeInTheDocument();

    const currencyRows = within(currencyPopover).getAllByRole('listitem');
    expect(currencyRows).toHaveLength(2);
    expect(currencyRows[0]).toHaveTextContent('EUR');
    expect(currencyRows[0]).toHaveTextContent('80.00');
    expect(currencyRows[1]).toHaveTextContent('TRY');
    expect(currencyRows[1]).toHaveTextContent('12.30');

    await user.keyboard('{Escape}');
    expect(
      screen.queryByRole('dialog', {
        name: 'Remaining debt currencies for South Ledger',
      }),
    ).not.toBeInTheDocument();

    await user.click(remainingExtraCurrencies);
    expect(
      await screen.findByRole('dialog', {
        name: 'Remaining debt currencies for South Ledger',
      }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('heading', { name: 'Customers' }));
    expect(
      screen.queryByRole('dialog', {
        name: 'Remaining debt currencies for South Ledger',
      }),
    ).not.toBeInTheDocument();
  });

  it('uses overdue amount labels and values for the overdue variant', async () => {
    const user = userEvent.setup();
    renderWithAppProviders(
      <CurrencyBalancesCell
        customer={financialCustomer}
        variant="overdueAmount"
      />,
    );

    expect(screen.getByText(/5\.00 USD/)).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', {
        name: 'Show 2 more overdue amount currencies for South Ledger',
      }),
    );

    const currencyPopover = await screen.findByRole('dialog', {
      name: 'Overdue amount currencies for South Ledger',
    });
    expect(
      within(currencyPopover).getByRole('heading', { name: 'Overdue amount' }),
    ).toBeInTheDocument();

    const currencyRows = within(currencyPopover).getAllByRole('listitem');
    expect(currencyRows[0]).toHaveTextContent('EUR');
    expect(currencyRows[0]).toHaveTextContent('0.00');
    expect(currencyRows[1]).toHaveTextContent('TRY');
    expect(currencyRows[1]).toHaveTextContent('2.00');
  });
});
