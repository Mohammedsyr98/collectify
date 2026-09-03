import '@testing-library/jest-dom/vitest';
import { cleanup, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { renderWithAppProviders } from '../../../shared/test/render';
import { CustomerTable } from '../list/CustomerTable';
import {
  customerList,
  financialCustomer,
  resetCustomerTestEnvironment,
} from './customerTestData';

describe('CustomerTable', () => {
  beforeEach(() => {
    resetCustomerTestEnvironment();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders customer directory columns and identity cells', () => {
    renderWithAppProviders(<CustomerTable customers={customerList.items} />);

    expect(
      screen.getByRole('columnheader', { name: 'Name' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Code' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Phone' })).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: 'Remaining debt' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: 'Overdue amount' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: 'Next due date' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: 'Actions' }),
    ).toBeInTheDocument();

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
      <CustomerTable customers={[financialCustomer, customerList.items[0]]} />,
    );

    const financialRow = screen.getByRole('row', { name: /South Ledger/ });
    expect(within(financialRow).getByText(/125\.50 USD/)).toBeInTheDocument();
    expect(within(financialRow).getByText(/5\.00 USD/)).toBeInTheDocument();
    expect(within(financialRow).getByText('2026-09-15')).toBeInTheDocument();
    expect(
      within(financialRow).getByRole('button', {
        name: 'Show 2 more remaining debt currencies for South Ledger',
      }),
    ).toHaveTextContent('+2 currencies');
    expect(
      within(financialRow).getByRole('button', {
        name: 'Show 2 more overdue amount currencies for South Ledger',
      }),
    ).toHaveTextContent('+2 currencies');

    const emptyFinancialRow = screen.getByRole('row', { name: /Acme Market/ });
    expect(within(emptyFinancialRow).getByText('No debt')).toBeInTheDocument();
    expect(within(emptyFinancialRow).getByText('No overdue')).toBeInTheDocument();
    expect(within(emptyFinancialRow).getByText('No due date')).toBeInTheDocument();
  });

  it('renders decorative skeleton rows in loading mode', () => {
    renderWithAppProviders(<CustomerTable customers={customerList.items} isLoading />);

    expect(screen.getByRole('table')).toHaveAttribute('aria-busy', 'true');
    expect(
      screen.getByRole('columnheader', { name: 'Name' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('cell', { name: 'Acme Market' })).not.toBeInTheDocument();
    expect(screen.getAllByTestId('customer-table-skeleton-row')).toHaveLength(6);
  });
});
