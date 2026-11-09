import '@testing-library/jest-dom/vitest';
import { cleanup, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { customerResources } from '@/features/customers';
import { getBackendUrl } from '@/shared/api';
import { sharedLocalizationResources } from '@/shared/localization';
import { server } from '@/shared/test';

import { customerDirectoryResources } from '../localization/resources';
import {
  baseCustomer,
  customerList,
  emptyDebtList,
  emptyCustomerList,
  northStarCustomer,
  resetCustomerDirectoryTestEnvironment,
} from './customerDirectoryTestData';
import { renderCustomerRoutes } from './renderCustomerRoutes';

const customerMessages = customerResources.en.common.customers;
const customerDirectoryMessages =
  customerDirectoryResources.en.common.customerDirectory;
const sharedMessages = sharedLocalizationResources.en.common;
const openActionsLabel = (name: string) =>
  customerDirectoryMessages.list.actions.openMenu.replace('{{name}}', name);

describe('CustomersPage row actions', () => {
  beforeEach(() => {
    resetCustomerDirectoryTestEnvironment();
    server.use(
      http.get(`${getBackendUrl()}/customers`, () => HttpResponse.json(emptyCustomerList)),
      http.get(`${getBackendUrl()}/customers/:customerId/debts`, () =>
        HttpResponse.json(emptyDebtList),
      ),
    );
  });

  afterEach(() => {
    cleanup();
  });

  it('navigates from a customer row to that customer details page', async () => {
    const user = userEvent.setup();
    server.use(
      http.get(`${getBackendUrl()}/customers`, () => HttpResponse.json(customerList)),
      http.get(`${getBackendUrl()}/customers/:customerId`, ({ params }) => {
        if (params.customerId !== northStarCustomer.id) {
          return HttpResponse.json(
            {
              code: 'CUSTOMER_NOT_FOUND',
              message: 'Customer was not found.',
            },
            { status: 404 },
          );
        }

        return HttpResponse.json(northStarCustomer);
      }),
    );

    renderCustomerRoutes();

    const northStarRow = await screen.findByRole('row', {
      name: /North Star Cafe/,
    });
    await user.click(
      within(northStarRow).getByRole('button', {
        name: openActionsLabel('North Star Cafe'),
      }),
    );
    await user.click(
      await screen.findByRole('menuitem', {
        name: customerDirectoryMessages.list.actions.openDetails,
      }),
    );

    expect(await screen.findByRole('heading', { name: 'North Star Cafe' })).toBeInTheDocument();
  });

  it('opens the edit flow from a customer row action', async () => {
    const user = userEvent.setup();
    const requestedCustomerIds: string[] = [];
    server.use(
      http.get(`${getBackendUrl()}/customers`, () => HttpResponse.json(customerList)),
      http.get(`${getBackendUrl()}/customers/:customerId`, ({ params }) => {
        requestedCustomerIds.push(String(params.customerId));

        return HttpResponse.json({
          ...baseCustomer,
          address: 'Main Street 42',
        });
      }),
    );

    renderCustomerRoutes();

    const acmeRow = await screen.findByRole('row', { name: /Acme Market/ });
    const actionsButton = within(acmeRow).getByRole('button', {
      name: openActionsLabel('Acme Market'),
    });
    await user.click(actionsButton);
    await user.click(
      await screen.findByRole('menuitem', { name: customerDirectoryMessages.list.actions.edit }),
    );

    expect(
      await screen.findByRole('heading', { name: customerMessages.edit.title }),
    ).toBeInTheDocument();
    expect(requestedCustomerIds).toEqual([baseCustomer.id]);
  });

  it('prefetches customer details when a row actions menu opens', async () => {
    const user = userEvent.setup();
    const requestedCustomerIds: string[] = [];
    server.use(
      http.get(`${getBackendUrl()}/customers`, () => HttpResponse.json(customerList)),
      http.get(`${getBackendUrl()}/customers/:customerId`, ({ params }) => {
        requestedCustomerIds.push(String(params.customerId));

        return HttpResponse.json({
          ...baseCustomer,
          address: 'Main Street 42',
        });
      }),
    );

    renderCustomerRoutes();

    const acmeRow = await screen.findByRole('row', { name: /Acme Market/ });
    const actionsButton = within(acmeRow).getByRole('button', {
      name: openActionsLabel('Acme Market'),
    });
    await user.click(actionsButton);

    await waitFor(() => expect(requestedCustomerIds).toEqual([baseCustomer.id]));

    await user.click(
      await screen.findByRole('menuitem', { name: customerDirectoryMessages.list.actions.edit }),
    );

    expect(
      await screen.findByRole('heading', { name: customerMessages.edit.title }),
    ).toBeInTheDocument();
    expect(requestedCustomerIds).toEqual([baseCustomer.id]);
  });

  it('returns focus to the row actions button after closing the editor', async () => {
    const user = userEvent.setup();
    server.use(
      http.get(`${getBackendUrl()}/customers`, () => HttpResponse.json(customerList)),
      http.get(`${getBackendUrl()}/customers/:customerId`, () =>
        HttpResponse.json(baseCustomer),
      ),
    );

    renderCustomerRoutes();

    const acmeRow = await screen.findByRole('row', { name: /Acme Market/ });
    const actionsButton = within(acmeRow).getByRole('button', {
      name: openActionsLabel('Acme Market'),
    });
    await user.click(actionsButton);
    await user.click(
      await screen.findByRole('menuitem', { name: customerDirectoryMessages.list.actions.edit }),
    );
    await screen.findByRole('dialog', { name: customerMessages.edit.title });

    await user.keyboard('{Escape}');

    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: customerMessages.edit.title }),
      ).not.toBeInTheDocument(),
    );
    expect(actionsButton).toHaveFocus();
  });

  it('shows disabled customer form fields while row edit details load', async () => {
    const user = userEvent.setup();
    const requestedCustomerIds: string[] = [];
    let resolveCustomerDetailsRequest!: () => void;
    const pendingCustomerDetailsRequest = new Promise<void>((resolve) => {
      resolveCustomerDetailsRequest = resolve;
    });
    server.use(
      http.get(`${getBackendUrl()}/customers`, () => HttpResponse.json(customerList)),
      http.get(`${getBackendUrl()}/customers/:customerId`, async ({ params }) => {
        requestedCustomerIds.push(String(params.customerId));
        await pendingCustomerDetailsRequest;

        return HttpResponse.json(baseCustomer);
      }),
    );

    renderCustomerRoutes();

    const acmeRow = await screen.findByRole('row', { name: /Acme Market/ });
    await user.click(
      within(acmeRow).getByRole('button', {
        name: openActionsLabel('Acme Market'),
      }),
    );
    await user.click(
      await screen.findByRole('menuitem', { name: customerDirectoryMessages.list.actions.edit }),
    );
    await waitFor(() => expect(requestedCustomerIds).toEqual([baseCustomer.id]));

    const editDialog = screen.getByRole('dialog', { name: customerMessages.edit.title });
    const closeButton = within(editDialog).getByRole('button', {
      name: customerMessages.edit.close,
    });

    try {
      expect(
        within(editDialog).getByRole('status'),
      ).toHaveTextContent(customerMessages.edit.loading);
      expect(closeButton).toHaveFocus();
      expect(within(editDialog).getByLabelText(customerMessages.form.nameLabel)).toBeDisabled();
      expect(within(editDialog).getByLabelText(customerMessages.form.codeLabel)).toBeDisabled();
      expect(
        within(editDialog).getByLabelText(customerMessages.form.phoneNumberLabel),
      ).toBeDisabled();
      expect(within(editDialog).getByLabelText(customerMessages.form.addressLabel)).toBeDisabled();
      expect(
        within(editDialog).getByRole('button', { name: customerMessages.actions.save }),
      ).toBeDisabled();
    } finally {
      resolveCustomerDetailsRequest();
    }

    await waitFor(() =>
      expect(screen.getByLabelText(customerMessages.form.nameLabel)).toHaveValue(baseCustomer.name),
    );
    expect(screen.getByRole('dialog', { name: customerMessages.edit.title })).toBe(editDialog);
    expect(closeButton).toHaveFocus();
  });

  it('closes row edit loading and shows an error toast when customer details fail to load', async () => {
    const user = userEvent.setup();
    const requestedCustomerIds: string[] = [];
    server.use(
      http.get(`${getBackendUrl()}/customers`, () => HttpResponse.json(customerList)),
      http.get(`${getBackendUrl()}/customers/:customerId`, ({ params }) => {
        requestedCustomerIds.push(String(params.customerId));

        return HttpResponse.text('Internal server error', { status: 500 });
      }),
    );

    renderCustomerRoutes();

    const acmeRow = await screen.findByRole('row', { name: /Acme Market/ });
    const actionsButton = within(acmeRow).getByRole('button', {
      name: openActionsLabel('Acme Market'),
    });
    await user.click(actionsButton);
    await user.click(
      await screen.findByRole('menuitem', { name: customerDirectoryMessages.list.actions.edit }),
    );
    await waitFor(() => expect(requestedCustomerIds).toContain(baseCustomer.id));

    expect(
      await screen.findByRole('alert', { name: customerMessages.toast.editLoad.errorTitle }),
    ).toHaveTextContent(sharedMessages.errors.genericDescription);
    expect(
      screen.queryByRole('dialog', { name: customerMessages.edit.title }),
    ).not.toBeInTheDocument();
    expect(actionsButton).toHaveFocus();
  });

});
