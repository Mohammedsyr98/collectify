import '@testing-library/jest-dom/vitest';
import { cleanup, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { getBackendUrl } from '@/shared/api';
import { sharedLocalizationResources } from '@/shared/localization';
import { server } from '@/shared/test';

import { customerDirectoryResources } from '../localization/resources';
import {
  customerList,
  emptyCustomerList,
  resetCustomerDirectoryTestEnvironment,
} from './customerDirectoryTestData';
import { renderCustomerRoutes } from './renderCustomerRoutes';

const customerDirectoryMessages =
  customerDirectoryResources.en.common.customerDirectory;
const sharedMessages = sharedLocalizationResources.en.common;

describe('CustomersPage list states', () => {
  beforeEach(() => {
    resetCustomerDirectoryTestEnvironment();
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

    expect(await screen.findByRole('status')).toHaveTextContent(customerDirectoryMessages.list.loading);
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: customerDirectoryMessages.list.columns.name }),
    ).toBeInTheDocument();

    resolveCustomerListRequest();
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());
  });

  it('shows the empty state instead of the table when the customer list has no items', async () => {
    renderCustomerRoutes();

    await waitFor(() =>
      expect(
        screen.getAllByText(customerDirectoryMessages.page.empty),
      ).toHaveLength(2),
    );
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('columnheader', { name: customerDirectoryMessages.list.columns.name }),
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
      name: customerDirectoryMessages.list.error.title,
    });
    expect(errorState).toHaveTextContent(sharedMessages.errors.genericDescription);
    expect(screen.queryByRole('table')).not.toBeInTheDocument();

    await user.click(
      within(errorState).getByRole('button', { name: 'Try again' }),
    );

    expect(await screen.findByRole('cell', { name: 'North Star Cafe' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'NSC-002' })).toBeInTheDocument();
    expect(
      screen.queryByRole('alert', { name: customerDirectoryMessages.list.error.title }),
    ).not.toBeInTheDocument();
    expect(customerListRequestCount).toBe(2);
  });

  // TODO: Cover same-query list refresh once a visible list action invalidates customers without leaving this page.
});
