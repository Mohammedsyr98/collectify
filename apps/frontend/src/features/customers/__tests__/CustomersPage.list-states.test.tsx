import '@testing-library/jest-dom/vitest';
import { cleanup, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { appShellResources } from '../../../app/localization/appShellResources';
import { getBackendUrl } from '../../../shared/api/http';
import { sharedLocalizationResources } from '../../../shared/localization/resources';
import { server } from '../../../shared/test/server';
import { customerResources } from '../localization/resources';
import {
  customerList,
  emptyCustomerList,
  resetCustomerTestEnvironment,
} from './customerTestData';
import { renderCustomerRoutes } from './renderCustomerRoutes';

const customerMessages = customerResources.en.common.customers;
const appMessages = appShellResources.en.common.app;
const sharedMessages = sharedLocalizationResources.en.common;

describe('CustomersPage list states', () => {
  beforeEach(() => {
    resetCustomerTestEnvironment();
    server.use(
      http.get(`${getBackendUrl()}/customers`, () => HttpResponse.json(emptyCustomerList)),
    );
  });

  afterEach(() => {
    cleanup();
  });

  it('renders a customer from the list response', async () => {
    server.use(http.get(`${getBackendUrl()}/customers`, () => HttpResponse.json(customerList)));

    renderCustomerRoutes();

    expect(await screen.findByRole('cell', { name: 'Acme Market' })).toBeInTheDocument();
  });

  it('renders the customer table loading state while the list request is pending', async () => {
    let resolveCustomerListRequest!: () => void;
    const pendingCustomerListRequest = new Promise<void>((resolve) => {
      resolveCustomerListRequest = resolve;
    });
    server.use(
      http.get(`${getBackendUrl()}/customers`, async () => {
        await pendingCustomerListRequest;

        return HttpResponse.json(emptyCustomerList);
      }),
    );

    renderCustomerRoutes();

    expect(await screen.findByRole('status')).toHaveTextContent(customerMessages.list.loading);
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: customerMessages.list.columns.name }),
    ).toBeInTheDocument();

    resolveCustomerListRequest();
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());
  });

  it('shows the empty state instead of the table when the customer list has no items', async () => {
    renderCustomerRoutes();

    await waitFor(() =>
      expect(
        screen.getAllByText(customerMessages.page.empty),
      ).toHaveLength(2),
    );
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('columnheader', { name: customerMessages.list.columns.name }),
    ).not.toBeInTheDocument();
  });

  it('shows a recoverable error and reloads customers on retry', async () => {
    const user = userEvent.setup();
    let customerListRequestCount = 0;
    server.use(
      http.get(`${getBackendUrl()}/customers`, () => {
        customerListRequestCount += 1;

        if (customerListRequestCount === 1) {
          return HttpResponse.text('Internal server error', { status: 500 });
        }

        return HttpResponse.json(customerList);
      }),
    );

    renderCustomerRoutes();

    const errorState = await screen.findByRole('alert', {
      name: customerMessages.list.error.title,
    });
    expect(errorState).toHaveTextContent(sharedMessages.errors.genericDescription);
    expect(screen.queryByRole('table')).not.toBeInTheDocument();

    await user.click(
      within(errorState).getByRole('button', { name: appMessages.error.retry }),
    );

    expect(await screen.findByRole('cell', { name: 'North Star Cafe' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'NSC-002' })).toBeInTheDocument();
    expect(
      screen.queryByRole('alert', { name: customerMessages.list.error.title }),
    ).not.toBeInTheDocument();
    expect(customerListRequestCount).toBe(2);
  });

  // TODO: Cover same-query list refresh once a visible list action invalidates customers without leaving this page.
});
