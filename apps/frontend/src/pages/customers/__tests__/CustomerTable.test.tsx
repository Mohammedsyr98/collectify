import '@testing-library/jest-dom/vitest';
import { cleanup, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithAppProviders } from './render';

import { CustomerTable } from '../list/CustomerTable';
import { customerDirectoryResources } from '../localization/resources';
import {
  customerList,
  financialCustomer,
  resetCustomerDirectoryTestEnvironment,
} from './customerDirectoryTestData';

const customerMessages = customerDirectoryResources.en.common.customerDirectory;
const extraCurrencyCountLabel = (count: number) =>
  customerMessages.list.extraCurrencies.count.replace('{{count}}', String(count));
const remainingExtraCurrenciesButtonLabel = (count: number, name: string) =>
  customerMessages.list.extraCurrencies.remainingAriaLabelPlural
    .replace('{{count}}', String(count))
    .replace('{{name}}', name);
const overdueExtraCurrenciesButtonLabel = (count: number, name: string) =>
  customerMessages.list.extraCurrencies.overdueAriaLabelPlural
    .replace('{{count}}', String(count))
    .replace('{{name}}', name);

describe('CustomerTable', () => {
  beforeEach(() => {
    resetCustomerDirectoryTestEnvironment();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders customer directory columns and identity cells', () => {
    renderWithAppProviders(
      <CustomerTable
        customers={customerList.items}
        onEditCustomer={vi.fn()}
        onPrefetchEditCustomer={vi.fn()}
      />,
    );

    expect(
      screen.getAllByRole('columnheader').map((header) => header.textContent),
    ).toEqual([
      customerMessages.list.columns.name,
      customerMessages.list.columns.code,
      customerMessages.list.columns.phone,
      customerMessages.list.columns.remainingDebt,
      customerMessages.list.columns.overdueAmount,
      customerMessages.list.columns.actions,
    ]);

    expect(screen.getByRole('cell', { name: 'Acme Market' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'ACME-001' })).toBeInTheDocument();
    expect(
      screen.getByRole('cell', { name: '+90 555 123 45 67' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('cell', { name: 'North Star Cafe' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'NSC-002' })).toBeInTheDocument();
    expect(
      screen.getByRole('cell', { name: '+90 555 456 78 90' }),
    ).toBeInTheDocument();
  });

  it('renders financial summary cells for customers with and without balances', () => {
    renderWithAppProviders(
      <CustomerTable
        customers={[financialCustomer, customerList.items[0]]}
        onEditCustomer={vi.fn()}
        onPrefetchEditCustomer={vi.fn()}
      />,
    );

    const financialRow = screen.getByRole('row', { name: /South Ledger/ });
    expect(within(financialRow).getByText(/125\.50 USD/)).toBeInTheDocument();
    expect(within(financialRow).getByText(/5\.00 USD/)).toBeInTheDocument();
    expect(
      within(financialRow).getByRole('button', {
        name: remainingExtraCurrenciesButtonLabel(2, 'South Ledger'),
      }),
    ).toHaveTextContent(extraCurrencyCountLabel(2));
    expect(
      within(financialRow).getByRole('button', {
        name: overdueExtraCurrenciesButtonLabel(2, 'South Ledger'),
      }),
    ).toHaveTextContent(extraCurrencyCountLabel(2));

    const emptyFinancialRow = screen.getByRole('row', { name: /Acme Market/ });
    expect(
      within(emptyFinancialRow).getByText(customerMessages.list.emptyFinancial.remainingDebt),
    ).toBeInTheDocument();
    expect(
      within(emptyFinancialRow).getByText(customerMessages.list.emptyFinancial.overdueAmount),
    ).toBeInTheDocument();
  });

  it('renders decorative skeleton rows in loading mode', () => {
    renderWithAppProviders(
      <CustomerTable
        customers={customerList.items}
        isLoading
        onEditCustomer={vi.fn()}
        onPrefetchEditCustomer={vi.fn()}
      />,
    );

    expect(screen.getByRole('table')).toHaveAttribute('aria-busy', 'true');
    expect(
      screen.getByRole('columnheader', { name: customerMessages.list.columns.name }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('cell', { name: 'Acme Market' })).not.toBeInTheDocument();
    expect(screen.getAllByTestId('customer-table-skeleton-row')).toHaveLength(6);
  });
});
