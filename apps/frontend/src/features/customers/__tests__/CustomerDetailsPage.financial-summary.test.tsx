import '@testing-library/jest-dom/vitest';
import { cleanup, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { getBackendUrl } from '../../../shared/api/http';
import { localeStorageKey } from '../../../shared/localization';
import { server } from '../../../shared/test/server';
import { emptyDebtList } from '../../debts/__tests__/debtTestData';
import { customerResources } from '../localization/resources';
import {
  baseCustomer,
  emptyCustomerList,
  resetCustomerTestEnvironment,
} from './customerTestData';
import { renderCustomerRoutes } from './renderCustomerRoutes';

const customerMessages = customerResources.en.common.customers;
const paymentProgressLabel = (currency: string) =>
  customerMessages.details.paymentProgress.replace('{{currency}}', currency);

const customerWithFinancialActivity = {
  ...baseCustomer,
  id: 'customer_financial_details',
  name: 'South Ledger',
  code: 'SL-003',
  financialSummary: [
    {
      currency: 'EUR',
      totalDebtAmount: '180.25',
      totalPaidAmount: '40.50',
      remainingAmount: '139.75',
    },
    {
      currency: 'USD',
      totalDebtAmount: '75.00',
      totalPaidAmount: '75.00',
      remainingAmount: '0.00',
    },
  ],
};

describe('CustomerDetailsPage financial summary', () => {
  beforeEach(() => {
    resetCustomerTestEnvironment();
    server.use(
      http.get(`${getBackendUrl()}/customers`, () =>
        HttpResponse.json(emptyCustomerList),
      ),
      http.get(`${getBackendUrl()}/customers/:customerId/debts`, () =>
        HttpResponse.json(emptyDebtList),
      ),
    );
  });

  afterEach(() => {
    cleanup();
  });

  it('renders populated financial summary values without combining currencies', async () => {
    server.use(
      http.get(`${getBackendUrl()}/customers/:customerId`, () =>
        HttpResponse.json(customerWithFinancialActivity),
      ),
    );

    renderCustomerRoutes([
      `/customers/${customerWithFinancialActivity.id}`,
    ]);

    const summary = await screen.findByRole('region', {
      name: customerMessages.details.financialSummary,
    });

    expect(summary).toHaveTextContent('EUR');
    expect(summary).toHaveTextContent('180.25');
    expect(summary).toHaveTextContent('40.50');
    expect(summary).toHaveTextContent('139.75');
  });

  it('shows all currency summaries by default and filters to one currency', async () => {
    const user = userEvent.setup();
    server.use(
      http.get(`${getBackendUrl()}/customers/:customerId`, () =>
        HttpResponse.json(customerWithFinancialActivity),
      ),
    );

    renderCustomerRoutes([
      `/customers/${customerWithFinancialActivity.id}`,
    ]);

    const summary = await screen.findByRole('region', {
      name: customerMessages.details.financialSummary,
    });
    const allCurrencies = screen.getByRole('button', {
      name: customerMessages.details.allCurrencies,
    });
    const usd = screen.getByRole('button', { name: 'USD' });

    expect(allCurrencies).toHaveAttribute('aria-pressed', 'true');
    expect(
      within(summary)
        .getAllByRole('progressbar')
        .map((progressbar) => progressbar.getAttribute('aria-label')),
    ).toEqual([
      paymentProgressLabel('EUR'),
      paymentProgressLabel('USD'),
    ]);

    await user.click(usd);

    expect(usd).toHaveAttribute('aria-pressed', 'true');
    expect(
      within(summary)
        .getAllByRole('progressbar')
        .map((progressbar) => progressbar.getAttribute('aria-label')),
    ).toEqual([paymentProgressLabel('USD')]);
    expect(summary).toHaveTextContent('75.00');
  });

  it('isolates localized currency amounts for Arabic reading order', async () => {
    window.localStorage.setItem(localeStorageKey, 'ar');
    server.use(
      http.get(`${getBackendUrl()}/customers/:customerId`, () =>
        HttpResponse.json(customerWithFinancialActivity),
      ),
    );

    renderCustomerRoutes([
      `/customers/${customerWithFinancialActivity.id}`,
    ]);

    const summary = await screen.findByRole('region', {
      name: 'الملخص المالي',
    });
    const amount = Array.from(summary.querySelectorAll('[dir="ltr"]')).find(
      (element) => element.textContent?.includes('€'),
    );

    if (!amount) {
      throw new Error('Expected an isolated EUR amount in the financial summary.');
    }

    expect(amount.tagName).toBe('BDI');
    expect(amount).toHaveAttribute('dir', 'ltr');
  });
});
